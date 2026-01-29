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

// --- INTERNAL CSV UTILITIES ---
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

  // --- UPDATED UPI TEST LOGIC TO FIX DEBIT ERROR ---
  const handleTestUPI = () => {
    const pa = "paytmqr1sir6vusjw@paytm";
    const am = "1.00";
    const tn = encodeURIComponent("registration for test");
    const tr = `TR${Math.floor(Math.random() * 1000000)}`; // Added mandatory TR to fix debit error

    // Constructing link without 'pn' (Name) as requested; App will fetch name from bank records
    const upiLink = `upi://pay?pa=${pa}&am=${am}&tn=${tn}&tr=${tr}&mc=0000&cu=INR`;

    window.location.href = upiLink;
  };

  return (
    <div className="max-w-7xl mx-auto p-4">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="text-sm text-gray-600 mt-1">Bonhomie 2026 Participation & Revenue</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleTestUPI}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 font-medium text-sm transition-colors"
          >
            <Smartphone className="h-4 w-4" /> Test UPI DeepLink2
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
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 font-medium text-sm transition-colors"
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
              <Users className="h-5 w-5" /> Participation
            </div>
          </button>
          <button
            onClick={() => setActiveTab("payment")}
            className={`pb-4 px-1 border-b-2 font-medium text-sm ${activeTab === "payment" ? "border-indigo-500 text-indigo-600" : "border-transparent text-gray-500"}`}
          >
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" /> Payment
            </div>
          </button>
        </nav>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20 text-gray-500 font-medium">
          Loading Statistics...
        </div>
      ) : (
        <>
          {activeTab === "participation" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg p-6 text-white shadow-lg relative overflow-hidden">
                  <p className="text-sm opacity-90">Total Registrations</p>
                  <p className="text-4xl font-bold mt-2">{stats.totalRegistrations}</p>
                  <div className="mt-4 grid grid-cols-3 gap-2 text-center text-[10px]">
                    <div className="bg-white/10 rounded p-1">
                      Conf: {stats.statusBreakdown.confirmed}
                    </div>
                    <div className="bg-white/10 rounded p-1">
                      Pend: {stats.statusBreakdown.pending}
                    </div>
                    <div className="bg-white/10 rounded p-1">
                      Rej: {stats.statusBreakdown.rejected}
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-lg border p-6 flex items-center justify-between shadow-sm">
                  <div>
                    <p className="text-sm text-gray-500">Popular Event</p>
                    <p className="text-lg font-bold truncate max-w-[150px]">
                      {stats.eventPopularity[0]?.name || "N/A"}
                    </p>
                  </div>
                  <TrendingUp className="text-green-500 h-10 w-10" />
                </div>
                <div className="bg-white rounded-lg border p-6 flex items-center justify-between shadow-sm">
                  <div>
                    <p className="text-sm text-gray-500">Active Depts</p>
                    <p className="text-3xl font-bold">
                      {Object.keys(stats.departmentBreakdown).length}
                    </p>
                  </div>
                  <Activity className="text-purple-500 h-10 w-10" />
                </div>
              </div>

              <div className="bg-white border rounded-lg p-6 shadow-sm">
                <h3 className="font-bold text-gray-900 mb-4 border-b pb-2">
                  Event Registration Ranking
                </h3>
                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                  {stats.eventPopularity.map((event, i) => (
                    <div key={i} className="flex flex-col gap-1">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-500 font-bold w-6">#{i + 1}</span>
                        <span className="flex-1 ml-2 font-medium text-gray-700">{event.name}</span>
                        <span className="font-bold text-indigo-600">{event.count}</span>
                      </div>
                      <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-indigo-500 h-full"
                          style={{
                            width: `${(event.count / stats.eventPopularity[0].count) * 100}%`,
                          }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === "payment" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-gradient-to-r from-green-600 to-green-500 text-white rounded-lg p-6 shadow-lg">
                  <p className="text-sm opacity-90">Total Revenue</p>
                  <p className="text-3xl font-bold mt-2">
                    ₹{paymentStats.totalRevenue.toLocaleString()}
                  </p>
                </div>
                {Object.entries(paymentStats.paymentModeBreakdown).map(([mode, amt]) => (
                  <div key={mode} className="bg-white border rounded-lg p-6 shadow-sm">
                    <p className="text-sm text-gray-500 capitalize">{mode} Mode</p>
                    <p className="text-xl font-bold text-gray-800 mt-1">₹{amt.toLocaleString()}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
