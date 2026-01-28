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
  const [activeTab, setActiveTab] = useState("participation"); // 'participation' or 'payment'
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState(eventIdFilter || null); // null = global, event_id = scoped
  const [events, setEvents] = useState([]);
  const [isExporting, setIsExporting] = useState(false);
  const [exportType, setExportType] = useState("individual"); // 'individual' or 'group'

  // Participation Stats
  const [stats, setStats] = useState({
    totalRegistrations: 0,
    genderBreakdown: { male: 0, female: 0, other: 0 },
    departmentBreakdown: {},
    eventPopularity: [],
    statusBreakdown: { confirmed: 0, pending: 0, rejected: 0 },
  });

  // Payment Stats
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

    // Filter for coordinator's assigned events
    if (coordinatorFilter && coordinatorFilter.length > 0) {
      query = query.in("id", coordinatorFilter);
    }

    const { data } = await query;
    setEvents(data || []);
  };

  const fetchParticipationStats = async () => {
    try {
      setLoading(true);

      // 1. Helper for exact counts (Status Breakdown)
      const getCountByStatus = async (status = null) => {
        let q = supabase.from("registrations").select("id", { count: "exact", head: true });
        if (selectedEvent) q = q.eq("event_id", selectedEvent);
        if (status) q = q.eq("status", status);
        const { count } = await q;
        return count || 0;
      };

      // Fetch all status counts in parallel
      const [total, confirmed, pending, rejected] = await Promise.all([
        getCountByStatus(),
        getCountByStatus("confirmed"),
        getCountByStatus("pending"),
        getCountByStatus("rejected"),
      ]);

      // 2. Recursive fetch to get ALL data for Gender/Dept charts (Bypasses 1000 limit)
      let allData = [];
      let from = 0;
      const step = 1000;
      let hasMore = true;

      while (hasMore) {
        let query = supabase
          .from("registrations")
          .select(
            `
            id,
            profile:profiles(gender, department),
            event:events(id, name)
          `
          )
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

        // Safety break to prevent infinite loops if something goes wrong
        if (allData.length >= 10000) hasMore = false;
      }

      // 3. Calculate Chart Breakdowns on the COMPLETE data set
      const genderBreakdown = { male: 0, female: 0, other: 0 };
      const departmentBreakdown = {};
      const eventCounts = {};

      allData.forEach(reg => {
        const gender = reg.profile?.gender?.toLowerCase() || "other";
        genderBreakdown[gender] = (genderBreakdown[gender] || 0) + 1;

        const dept = reg.profile?.department || "Unknown";
        departmentBreakdown[dept] = (departmentBreakdown[dept] || 0) + 1;

        if (!selectedEvent && reg.event) {
          eventCounts[reg.event.name] = (eventCounts[reg.event.name] || 0) + 1;
        }
      });

      setStats({
        totalRegistrations: total,
        statusBreakdown: { confirmed, pending, rejected },
        genderBreakdown,
        departmentBreakdown,
        eventPopularity: Object.entries(eventCounts)
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10),
      });
    } catch (error) {
      console.error("Error fetching participation stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPaymentStats = async () => {
    try {
      // For revenue, we also fetch all records to ensure nothing is missed
      let allData = [];
      let from = 0;
      let hasMore = true;

      while (hasMore) {
        let query = supabase
          .from("registrations")
          .select(
            `
            id,
            profile_id,
            payment_mode,
            team_members,
            transaction_id,
            payment_screenshot_path,
            event:events(id, name, fee)
          `
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

  // Export handlers
  const handleExportParticipants = async () => {
    setIsExporting(true);
    try {
      let allExportData = [];
      let from = 0;
      let hasMore = true;

      while (hasMore) {
        let query = supabase
          .from("registrations")
          .select(
            `
            id,
            status,
            team_members,
            profile:profiles(full_name, roll_number, college_email, school, department, year_of_study, gender, phone),
            event:events(id, name, category, subcategory)
          `
          )
          .eq("status", "confirmed")
          .range(from, from + 999);

        if (selectedEvent) query = query.eq("event_id", selectedEvent);

        const { data, error } = await query;
        if (error) throw error;

        if (data && data.length > 0) {
          allExportData = [...allExportData, ...data];
          from += 1000;
        } else {
          hasMore = false;
        }
      }

      const individual = allExportData.filter(reg => reg.event?.subcategory === "Individual");
      const team = allExportData.filter(reg => reg.event?.subcategory === "Group");

      if (exportType === "individual") {
        if (individual.length > 0) {
          const individualData = generateIndividualParticipantsCSV(individual);
          const headers = [
            { label: "Event No" },
            { label: "Event Name" },
            { label: "Member No" },
            { label: "Roll Number" },
            { label: "Name" },
            { label: "Email" },
            { label: "School" },
            { label: "Department" },
            { label: "Year of Study" },
            { label: "Gender" },
            { label: "Phone" },
            { label: "Category" },
          ];
          const csv = arrayToCSV(individualData, headers);
          const eventName = selectedEvent
            ? events.find(e => e.id === selectedEvent)?.name
            : "all_events";
          downloadCSV(csv, `participants_individual_${eventName}_${getFormattedDate()}.csv`);
        } else {
          alert("No individual event participant data available");
        }
      } else if (exportType === "group") {
        if (team.length > 0) {
          const teamData = generateTeamParticipantsCSV(team);
          const headers = [
            { label: "Event No" },
            { label: "Event Name" },
            { label: "Team No" },
            { label: "Member No" },
            { label: "Roll Number" },
            { label: "Name" },
            { label: "Email" },
            { label: "School" },
            { label: "Department" },
            { label: "Year of Study" },
            { label: "Gender" },
            { label: "Phone" },
            { label: "Category" },
          ];
          const csv = arrayToCSV(teamData, headers);
          const eventName = selectedEvent
            ? events.find(e => e.id === selectedEvent)?.name
            : "all_events";
          downloadCSV(csv, `participants_group_${eventName}_${getFormattedDate()}.csv`);
        } else {
          alert("No group event participant data available");
        }
      }
    } catch (error) {
      console.error("Error exporting participants:", error);
      alert("Failed to export participants data");
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPayments = async () => {
    setIsExporting(true);
    try {
      let allPaymentData = [];
      let from = 0;
      let hasMore = true;

      while (hasMore) {
        let query = supabase
          .from("registrations")
          .select(
            `
            id, status, transaction_id, payment_mode, team_members, registered_at,
            profile_id, event_id, profile:profiles(full_name), event:events(id, name, fee)
          `
          )
          .eq("status", "confirmed")
          .range(from, from + 999);

        if (selectedEvent) query = query.eq("event_id", selectedEvent);

        const { data, error } = await query;
        if (error) throw error;

        if (data && data.length > 0) {
          allPaymentData = [...allPaymentData, ...data];
          from += 1000;
        } else {
          hasMore = false;
        }
      }

      if (allPaymentData.length === 0) {
        alert("No payment data available to export");
        return;
      }

      const paymentData = generatePaymentCSV(allPaymentData);
      const headers = [
        { label: "Event No" },
        { label: "Event Name" },
        { label: "Registration Type" },
        { label: "Participant Name" },
        { label: "Transaction ID" },
        { label: "Payment Mode" },
        { label: "Amount" },
        { label: "Status" },
        { label: "Payment Date" },
      ];
      const csv = arrayToCSV(paymentData, headers);
      const eventName = selectedEvent
        ? events.find(e => e.id === selectedEvent)?.name
        : "all_events";
      downloadCSV(csv, `payments_${eventName}_${getFormattedDate()}.csv`);
    } catch (error) {
      console.error("Error exporting payments:", error);
      alert("Failed to export payment data");
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportNBA = async () => {
    setIsExporting(true);
    try {
      let allNBAData = [];
      let from = 0;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from("registrations")
          .select(`id, status, team_members, event:events(id, name, category, subcategory)`)
          .range(from, from + 999);

        if (error) throw error;
        if (data && data.length > 0) {
          allNBAData = [...allNBAData, ...data];
          from += 1000;
        } else {
          hasMore = false;
        }
      }

      const csv = generateNBACSV(allNBAData);
      downloadCSV(csv, `NBA_Bonhomie_2026_${getFormattedDate()}.csv`);
    } catch (error) {
      console.error("Error exporting NBA report:", error);
      alert("Failed to export NBA report");
    } finally {
      setIsExporting(false);
    }
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
          <select
            value={selectedEvent || ""}
            onChange={e => setSelectedEvent(e.target.value || null)}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
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
            onClick={() => {
              if (activeTab === "participation") {
                exportType === "nba" ? handleExportNBA() : handleExportParticipants();
              } else {
                handleExportPayments();
              }
            }}
            disabled={isExporting}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium text-sm"
          >
            <Download className="h-4 w-4" />
            {isExporting ? "Exporting..." : "Export"}
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab("participation")}
            className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === "participation"
                ? "border-indigo-500 text-indigo-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Participation Analytics
            </div>
          </button>
          <button
            onClick={() => setActiveTab("payment")}
            className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === "payment"
                ? "border-indigo-500 text-indigo-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Payment Analytics
            </div>
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === "participation" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg shadow-sm border border-gray-200 p-6 text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 w-20 h-20 bg-white opacity-10 rounded-full -mr-10 -mt-10"></div>
              <div className="relative">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm opacity-90">Total Registrations</p>
                  <Users className="h-8 w-8 opacity-75" />
                </div>
                <p className="text-4xl font-bold mb-4">{stats.totalRegistrations}</p>
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-white/10 backdrop-blur-sm rounded px-2 py-1.5">
                    <div className="text-xs opacity-75">Confirmed</div>
                    <div className="text-lg font-bold text-green-300">
                      {stats.statusBreakdown.confirmed}
                    </div>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm rounded px-2 py-1.5">
                    <div className="text-xs opacity-75">Pending</div>
                    <div className="text-lg font-bold text-blue-300">
                      {stats.statusBreakdown.pending}
                    </div>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm rounded px-2 py-1.5">
                    <div className="text-xs opacity-75">Rejected</div>
                    <div className="text-lg font-bold text-red-300">
                      {stats.statusBreakdown.rejected}
                    </div>
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
                    <span className="text-sm font-medium text-gray-700 capitalize">{gender}</span>
                    <div className="flex items-center gap-3">
                      <div className="w-32 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-indigo-600 h-2 rounded-full"
                          style={{
                            width: `${stats.totalRegistrations ? (count / stats.totalRegistrations) * 100 : 0}%`,
                          }}
                        ></div>
                      </div>
                      <span className="text-sm font-semibold text-gray-900 w-12 text-right">
                        {count}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Department Breakdown</h3>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {Object.entries(stats.departmentBreakdown)
                  .sort((a, b) => b[1] - a[1])
                  .map(([dept, count]) => (
                    <div key={dept} className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">{dept}</span>
                      <span className="px-2 py-1 bg-indigo-100 text-indigo-800 rounded text-sm font-semibold">
                        {count}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "payment" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-lg p-6 text-white">
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
