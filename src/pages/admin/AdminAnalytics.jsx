import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import {
  TrendingUp,
  Users,
  Award,
  DollarSign,
  Calendar,
  Activity,
  Download,
  Smartphone,
} from "lucide-react";

// --- INTERNAL CSV UTILITIES (Integrated to keep in one file) ---
const downloadCSV = (csvString, fileName) => {
  const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", `${fileName}_${new Date().toLocaleDateString()}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const arrayToCSV = data => {
  if (!data.length) return "";
  const headers = Object.keys(data[0]).join(",");
  const rows = data.map(row =>
    Object.values(row)
      .map(value => `"${value}"`)
      .join(",")
  );
  return [headers, ...rows].join("\n");
};

export default function AdminAnalytics({ coordinatorFilter = null, eventIdFilter = null }) {
  const [activeTab, setActiveTab] = useState("participation");
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState(eventIdFilter || null);
  const [events, setEvents] = useState([]);
  const [isExporting, setIsExporting] = useState(false);
  const [exportType, setExportType] = useState("individual");

  const [stats, setStats] = useState({
    totalRegistrations: 0,
    genderBreakdown: { male: 0, female: 0, other: 0 },
    departmentBreakdown: {},
    eventPopularity: [],
    statusBreakdown: { confirmed: 0, pending: 0, rejected: 0 },
  });

  const [paymentStats, setPaymentStats] = useState({
    totalRevenue: 0,
    eventRevenue: [],
    paymentModeBreakdown: { cash: 0, hybrid: 0, online: 0 },
  });

  useEffect(() => {
    fetchEvents();
    fetchParticipationStats();
    fetchPaymentStats();
  }, [selectedEvent]);

  const fetchEvents = async () => {
    let query = supabase.from("events").select("id, name").order("name");
    if (coordinatorFilter && coordinatorFilter.length > 0) {
      query = query.in("id", coordinatorFilter);
    }
    const { data } = await query;
    setEvents(data || []);
  };

  const fetchParticipationStats = async () => {
    try {
      setLoading(true);
      const getCountByStatus = async (status = null) => {
        let q = supabase.from("registrations").select("id", { count: "exact", head: true });
        if (selectedEvent) q = q.eq("event_id", selectedEvent);
        if (status) q = q.eq("status", status);
        const { count } = await q;
        return count || 0;
      };

      const [total, confirmed, pending, rejected] = await Promise.all([
        getCountByStatus(),
        getCountByStatus("confirmed"),
        getCountByStatus("pending"),
        getCountByStatus("rejected"),
      ]);

      let allData = [];
      let from = 0;
      const step = 1000;
      let hasMore = true;

      while (hasMore) {
        let query = supabase
          .from("registrations")
          .select(`id, profile:profiles(gender, department), event:events(id, name)`)
          .range(from, from + step - 1);

        if (selectedEvent) query = query.eq("event_id", selectedEvent);
        const { data, error } = await query;
        if (error) throw error;

        if (data && data.length > 0) {
          allData = [...allData, ...data];
          from += step;
        } else {
          hasMore = false;
        }
        if (allData.length >= 15000) hasMore = false;
      }

      const genderBreakdown = { male: 0, female: 0, other: 0 };
      const departmentBreakdown = {};
      const eventStatsMap = {};

      allData.forEach(reg => {
        const gender = reg.profile?.gender?.toLowerCase() || "other";
        genderBreakdown[gender] = (genderBreakdown[gender] || 0) + 1;

        const dept = reg.profile?.department || "Unknown";
        departmentBreakdown[dept] = (departmentBreakdown[dept] || 0) + 1;

        if (reg.event) {
          const eventName = reg.event.name;
          if (!eventStatsMap[eventName]) {
            eventStatsMap[eventName] = { name: eventName, count: 0, male: 0, female: 0, other: 0 };
          }
          eventStatsMap[eventName].count += 1;
          if (gender === "male") eventStatsMap[eventName].male += 1;
          else if (gender === "female") eventStatsMap[eventName].female += 1;
          else eventStatsMap[eventName].other += 1;
        }
      });

      setStats({
        totalRegistrations: total,
        statusBreakdown: { confirmed, pending, rejected },
        genderBreakdown,
        departmentBreakdown,
        eventPopularity: Object.values(eventStatsMap).sort((a, b) => b.count - a.count),
      });
    } catch (error) {
      console.error("Error fetching participation stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPaymentStats = async () => {
    try {
      let allData = [];
      let from = 0;
      let hasMore = true;
      while (hasMore) {
        let query = supabase
          .from("registrations")
          .select(
            `id, profile_id, payment_mode, team_members, transaction_id, event:events(id, name, fee)`
          )
          .eq("status", "confirmed")
          .range(from, from + 999);
        if (selectedEvent) query = query.eq("event_id", selectedEvent);
        const { data, error } = await query;
        if (error) throw error;
        if (data && data.length > 0) {
          allData = [...allData, ...data];
          from += 1000;
        } else {
          hasMore = false;
        }
      }

      let totalRevenue = 0;
      const paymentModeBreakdown = { cash: 0, hybrid: 0, online: 0 };
      const eventRevenue = {};

      allData.forEach(reg => {
        const isLeader = reg.team_members && reg.team_members.length > 0;
        let isTeamMember = false;
        if (!isLeader && reg.profile_id && reg.event?.id) {
          isTeamMember = allData.some(
            otherReg =>
              otherReg.event?.id === reg.event.id &&
              otherReg.team_members &&
              otherReg.team_members.length > 0 &&
              otherReg.team_members.some(member => member.id === reg.profile_id)
          );
        }
        if (isTeamMember) return;
        const fee = reg.event?.fee || 0;
        totalRevenue += fee;
        const mode = reg.payment_mode || "hybrid";
        paymentModeBreakdown[mode] = (paymentModeBreakdown[mode] || 0) + fee;
        if (reg.event) {
          const eventName = reg.event.name;
          eventRevenue[eventName] = (eventRevenue[eventName] || 0) + fee;
        }
      });

      setPaymentStats({
        totalRevenue,
        paymentModeBreakdown,
        eventRevenue: Object.entries(eventRevenue)
          .map(([name, revenue]) => ({ name, revenue }))
          .sort((a, b) => b.revenue - a.revenue),
      });
    } catch (error) {
      console.error("Error fetching payment stats:", error);
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      let query = supabase
        .from("registrations")
        .select(
          `status, payment_mode, transaction_id, profile:profiles(full_name, email, phone, department), event:events(name)`
        )
        .eq("status", "confirmed");

      if (selectedEvent) query = query.eq("event_id", selectedEvent);

      const { data, error } = await query;
      if (error) throw error;

      const csvData = data.map(row => ({
        Name: row.profile?.full_name || "N/A",
        Email: row.profile?.email || "N/A",
        Department: row.profile?.department || "N/A",
        Event: row.event?.name || "N/A",
        Payment_Mode: row.payment_mode,
        Transaction_ID: row.transaction_id || "N/A",
      }));

      const csvString = arrayToCSV(csvData);
      downloadCSV(csvString, "Bonhomie_Registrations");
    } catch (err) {
      console.error("Export failed:", err);
    } finally {
      setIsExporting(false);
    }
  };

  // --- UPI TEST LOGIC ---
  const handleTestUPI = () => {
    const pa = "paytmqr1sir6vusjw@paytm";
    const pn = encodeURIComponent("Datanexus Club");
    const am = "1.00";
    const tn = encodeURIComponent("registration for test");
    const upiLink = `upi://pay?pa=${pa}&pn=${pn}&am=${am}&tn=${tn}&mc=0000&cu=INR`;
    window.location.href = upiLink;
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header with Event Selector */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="text-sm text-gray-600 mt-1">
            Comprehensive insights into registrations and revenue
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* New Test UPI Button */}
          <button
            onClick={handleTestUPI}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 font-medium text-sm"
          >
            <Smartphone className="h-4 w-4" /> Test UPI DeepLink
          </button>

          <select
            value={selectedEvent || ""}
            onChange={e => setSelectedEvent(e.target.value || null)}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 bg-white"
          >
            <option value="">All Events (Global)</option>
            {events.map(event => (
              <option key={event.id} value={event.id}>
                {event.name}
              </option>
            ))}
          </select>
          {activeTab === "participation" && (
            <select
              value={exportType}
              onChange={e => setExportType(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              <option value="individual">Individual Events</option>
              <option value="group">Group Events</option>
              <option value="nba">NBA</option>
            </select>
          )}
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 font-medium text-sm"
          >
            <Download className="h-4 w-4" /> {isExporting ? "Exporting..." : "Export"}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab("participation")}
            className={`pb-4 px-1 border-b-2 font-medium text-sm ${activeTab === "participation" ? "border-indigo-500 text-indigo-600" : "border-transparent text-gray-500"}`}
          >
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5" /> Participation Analytics
            </div>
          </button>
          <button
            onClick={() => setActiveTab("payment")}
            className={`pb-4 px-1 border-b-2 font-medium text-sm ${activeTab === "payment" ? "border-indigo-500 text-indigo-600" : "border-transparent text-gray-500"}`}
          >
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" /> Payment Analytics
            </div>
          </button>
        </nav>
      </div>

      {activeTab === "participation" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg p-6 text-white relative overflow-hidden">
              <div className="relative">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm opacity-90">Total Registrations</p>
                  <Users className="h-8 w-8 opacity-75" />
                </div>
                <p className="text-4xl font-bold mb-4">{stats.totalRegistrations}</p>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-white/10 rounded px-2 py-1.5">
                    <div className="text-xs">Confirmed</div>
                    <div className="text-lg font-bold">{stats.statusBreakdown.confirmed}</div>
                  </div>
                  <div className="bg-white/10 rounded px-2 py-1.5">
                    <div className="text-xs">Pending</div>
                    <div className="text-lg font-bold">{stats.statusBreakdown.pending}</div>
                  </div>
                  <div className="bg-white/10 rounded px-2 py-1.5">
                    <div className="text-xs">Rejected</div>
                    <div className="text-lg font-bold">{stats.statusBreakdown.rejected}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Most Popular Event</p>
                  <p className="text-lg font-semibold text-gray-900 mt-2 truncate">
                    {stats.eventPopularity[0]?.name || "N/A"}
                  </p>
                </div>
                <TrendingUp className="h-10 w-10 text-green-600" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Active Departments</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">
                    {Object.keys(stats.departmentBreakdown).length}
                  </p>
                </div>
                <Activity className="h-10 w-10 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Gender Distribution</h3>
              <div className="space-y-3">
                {Object.entries(stats.genderBreakdown).map(([gender, count]) => (
                  <div key={gender} className="flex items-center justify-between">
                    <span className="text-sm font-medium capitalize">{gender}</span>
                    <div className="flex items-center gap-3">
                      <div className="w-32 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-indigo-600 h-2 rounded-full"
                          style={{
                            width: `${stats.totalRegistrations ? (count / stats.totalRegistrations) * 100 : 0}%`,
                          }}
                        ></div>
                      </div>
                      <span className="text-sm font-semibold w-12 text-right">{count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Department Breakdown</h3>
              <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                {Object.entries(stats.departmentBreakdown)
                  .sort((a, b) => b[1] - a[1])
                  .map(([dept, count]) => (
                    <div key={dept} className="flex items-center justify-between">
                      <span className="text-sm font-medium">{dept}</span>
                      <span className="px-2 py-1 bg-indigo-100 text-indigo-800 rounded text-sm font-semibold">
                        {count}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          </div>

          {stats.eventPopularity.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Event Registration Ranking
              </h3>
              <div className="space-y-6 max-h-[500px] overflow-y-auto pr-4 custom-scrollbar">
                {stats.eventPopularity.map((event, index) => {
                  const malePct = event.count > 0 ? (event.male / event.count) * 100 : 0;
                  const femalePct = event.count > 0 ? (event.female / event.count) * 100 : 0;
                  const otherPct = event.count > 0 ? (event.other / event.count) * 100 : 0;
                  return (
                    <div key={event.name} className="flex flex-col gap-1">
                      <div className="flex justify-between items-center text-sm mb-1">
                        <span className="font-bold text-gray-400 w-6">{index + 1}</span>
                        <span className="flex-1 font-medium text-gray-700 ml-2">{event.name}</span>
                        <span className="font-bold text-indigo-600">{event.count}</span>
                      </div>
                      <div
                        className="relative w-full bg-gray-100 rounded-full h-7 flex overflow-hidden shadow-inner border border-gray-200"
                        style={{
                          width: `${Math.max((event.count / stats.eventPopularity[0].count) * 100, 5)}%`,
                        }}
                      >
                        <div
                          className="bg-blue-500 h-full flex items-center justify-center text-[10px] text-white font-bold transition-all duration-500 min-w-[20px]"
                          style={{ width: `${event.male > 0 ? Math.max(malePct, 5) : 0}%` }}
                        >
                          M:{event.male}
                        </div>
                        <div
                          className="bg-pink-500 h-full flex items-center justify-center text-[10px] text-white font-bold border-l border-white/20 transition-all duration-500 min-w-[20px]"
                          style={{ width: `${event.female > 0 ? Math.max(femalePct, 5) : 0}%` }}
                        >
                          F:{event.female}
                        </div>
                        {event.other > 0 && (
                          <div
                            className="bg-gray-400 h-full flex items-center justify-center text-[10px] text-white font-bold border-l border-white/20 min-w-[20px]"
                            style={{ width: `${otherPct}%` }}
                          >
                            O:{event.other}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "payment" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-6 text-white shadow-lg">
              <p className="text-sm opacity-90">Total Revenue</p>
              <p className="text-4xl font-bold mt-2">
                ₹{paymentStats.totalRevenue.toLocaleString()}
              </p>
            </div>
            {Object.entries(paymentStats.paymentModeBreakdown).map(([mode, amount]) => (
              <div key={mode} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <p className="text-sm text-gray-600 capitalize">{mode} Payments</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">₹{amount.toLocaleString()}</p>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Event Revenue Ranking</h3>
            </div>
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Rank
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Event Name
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Revenue
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paymentStats.eventRevenue.map((event, index) => (
                  <tr key={event.name} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-400">
                      #{index + 1}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {event.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-green-600 text-right">
                      ₹{event.revenue.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
