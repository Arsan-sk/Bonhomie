import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { TrendingUp, Users, Award, DollarSign, Calendar, Activity, Download } from "lucide-react";
import {
  generateIndividualParticipantsCSV,
  generateTeamParticipantsCSV,
  generatePaymentCSV,
  generateNBACSV,
  arrayToCSV,
  downloadCSV,
  getFormattedDate,
} from "../../utils/csvExport";

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
      setLoading(true); // Start Loading
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

      // Recursive Loop: Wait for ALL data before moving on
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
      setLoading(false); // Only stop loading when ALL loops are finished
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

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header with Selector */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="text-sm text-gray-600 mt-1">Comprehensive insights for Bonhomie 2026</p>
        </div>
        <div className="flex items-center gap-3">
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
          <button className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium">
            <Download className="h-4 w-4" /> Export
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
            Participation Analytics
          </button>
          <button
            onClick={() => setActiveTab("payment")}
            className={`pb-4 px-1 border-b-2 font-medium text-sm ${activeTab === "payment" ? "border-indigo-500 text-indigo-600" : "border-transparent text-gray-500"}`}
          >
            Payment Analytics
          </button>
        </nav>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64 text-gray-500 animate-pulse">
          Loading Analytics Data...
        </div>
      ) : (
        <>
          {activeTab === "participation" && (
            <div className="space-y-6">
              {/* Metrics Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg p-6 text-white relative overflow-hidden shadow-md">
                  <div className="relative">
                    <p className="text-sm opacity-90">Total Registrations</p>
                    <p className="text-4xl font-bold mb-4">{stats.totalRegistrations}</p>
                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="bg-white/10 rounded py-1">
                        Confirmed
                        <br />
                        <b>{stats.statusBreakdown.confirmed}</b>
                      </div>
                      <div className="bg-white/10 rounded py-1">
                        Pending
                        <br />
                        <b>{stats.statusBreakdown.pending}</b>
                      </div>
                      <div className="bg-white/10 rounded py-1">
                        Rejected
                        <br />
                        <b>{stats.statusBreakdown.rejected}</b>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Most Popular</p>
                      <p className="text-lg font-semibold truncate">
                        {stats.eventPopularity[0]?.name || "N/A"}
                      </p>
                    </div>
                    <TrendingUp className="h-10 w-10 text-green-600" />
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Active Depts</p>
                      <p className="text-3xl font-bold">
                        {Object.keys(stats.departmentBreakdown).length}
                      </p>
                    </div>
                    <Activity className="h-10 w-10 text-purple-600" />
                  </div>
                </div>
              </div>

              {/* Gender and Dept Breakdown */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold mb-4 text-gray-900">Gender Distribution</h3>
                  {Object.entries(stats.genderBreakdown).map(([gender, count]) => (
                    <div key={gender} className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium capitalize w-20">{gender}</span>
                      <div className="flex-1 mx-4 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-indigo-600 h-2 rounded-full"
                          style={{ width: `${(count / stats.totalRegistrations) * 100}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-semibold">{count}</span>
                    </div>
                  ))}
                </div>

                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold mb-4 text-gray-900">Dept Breakdown</h3>
                  <div className="space-y-3 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                    {Object.entries(stats.departmentBreakdown)
                      .sort((a, b) => b[1] - a[1])
                      .map(([dept, count]) => (
                        <div key={dept} className="flex justify-between items-center text-sm">
                          <span className="text-gray-700">{dept}</span>
                          <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-bold">
                            {count}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              </div>

              {/* SCROLLABLE EVENT RANKING WITH STACKED GENDER BARS */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Event Registration Ranking
                </h3>
                <div className="space-y-6 max-h-[500px] overflow-y-auto pr-4 custom-scrollbar">
                  {stats.eventPopularity.map((event, index) => {
                    const malePct = (event.male / event.count) * 100;
                    const femalePct = (event.female / event.count) * 100;
                    return (
                      <div key={event.name} className="flex flex-col gap-1">
                        <div className="flex justify-between items-center text-sm mb-1 font-medium">
                          <span>
                            {index + 1}. {event.name}
                          </span>
                          <span className="text-indigo-600 font-bold">{event.count}</span>
                        </div>
                        <div
                          className="relative w-full bg-gray-100 rounded-full h-7 flex overflow-hidden shadow-inner border border-gray-200"
                          style={{
                            width: `${Math.max((event.count / stats.eventPopularity[0].count) * 100, 5)}%`,
                          }}
                        >
                          {event.male > 0 && (
                            <div
                              className="bg-blue-500 h-full flex items-center justify-center text-[10px] text-white font-bold transition-all min-w-[20px]"
                              style={{ width: `${Math.max(malePct, 5)}%` }}
                            >
                              M:{event.male}
                            </div>
                          )}
                          {event.female > 0 && (
                            <div
                              className="bg-pink-500 h-full flex items-center justify-center text-[10px] text-white font-bold border-l border-white/20 transition-all min-w-[20px]"
                              style={{ width: `${Math.max(femalePct, 5)}%` }}
                            >
                              F:{event.female}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {activeTab === "payment" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-6 text-white shadow-lg">
                  <p className="text-sm opacity-90 font-medium">Total Revenue</p>
                  <p className="text-4xl font-bold mt-2">
                    ₹{paymentStats.totalRevenue.toLocaleString()}
                  </p>
                </div>
                {Object.entries(paymentStats.paymentModeBreakdown).map(([mode, amount]) => (
                  <div
                    key={mode}
                    className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
                  >
                    <p className="text-sm text-gray-600 capitalize font-medium">{mode} Payments</p>
                    <p className="text-2xl font-bold mt-2 text-gray-900">
                      ₹{amount.toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 font-semibold text-gray-900">
                  Event Revenue Ranking
                </div>
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr className="text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                      <th className="px-6 py-3">Rank</th>
                      <th className="px-6 py-3">Event Name</th>
                      <th className="px-6 py-3 text-right">Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200 text-sm">
                    {paymentStats.eventRevenue.map((event, index) => (
                      <tr key={event.name} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 font-bold text-gray-400">#{index + 1}</td>
                        <td className="px-6 py-4 font-medium text-gray-900">{event.name}</td>
                        <td className="px-6 py-4 font-bold text-green-600 text-right">
                          ₹{event.revenue.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
