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
  Copy,
  Check,
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
  const [copied, setCopied] = useState(false);

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
        Payment: row.payment_mode,
        Transaction_ID: row.transaction_id || "N/A",
      }));

      downloadCSV(arrayToCSV(csvData), "Bonhomie_Registrations");
    } finally {
      setIsExporting(false);
    }
  };

  // --- THE FIXED ULTIMATE DEEP LINK LOGIC ---
  const handleTestUPI = () => {
    const pa = "paytmqr1sir6vusjw@paytm";
    const am = "1.00";
    const tn = encodeURIComponent("Registration for Vlog");
    const tr = `BNH${Date.now()}`; // Unique tracking ID

    // Using 'mam' (Minimum Amount) to match 'am' to prevent debit errors
    const upiLink = `upi://pay?pa=${pa}&am=${am}&mam=${am}&tn=${tn}&tr=${tr}&cu=INR`;

    window.location.href = upiLink;
  };

  const copyUPI = () => {
    navigator.clipboard.writeText("paytmqr1sir6vusjw@paytm");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-7xl mx-auto p-4">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="text-sm text-gray-600 mt-1">Real-time Event Stats</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Test Button + Copy Fallback */}
          <div className="flex border rounded-lg overflow-hidden shadow-sm">
            <button
              onClick={handleTestUPI}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700 text-sm font-medium transition-colors"
            >
              <Smartphone className="h-4 w-4" /> test 3
            </button>
            <button
              onClick={copyUPI}
              className="px-3 py-2 bg-white text-gray-600 hover:bg-gray-50 border-l transition-colors"
              title="Copy UPI ID"
            >
              {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>

          <select
            value={selectedEvent || ""}
            onChange={e => setSelectedEvent(e.target.value || null)}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm bg-white"
          >
            <option value="">All Events</option>
            {events.map(event => (
              <option key={event.id} value={event.id}>
                {event.name}
              </option>
            ))}
          </select>
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 font-medium text-sm"
          >
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
            Participation
          </button>
          <button
            onClick={() => setActiveTab("payment")}
            className={`pb-4 px-1 border-b-2 font-medium text-sm ${activeTab === "payment" ? "border-indigo-500 text-indigo-600" : "border-transparent text-gray-500"}`}
          >
            Payments
          </button>
        </nav>
      </div>

      {loading ? (
        <div className="text-center py-20 text-gray-400">Loading Data...</div>
      ) : (
        <div className="space-y-6">
          {/* Your existing stats rendering logic continues here... */}
          <div className="bg-white p-6 border rounded-lg shadow-sm">
            <p className="text-gray-500 text-sm">Total Registrations</p>
            <h2 className="text-3xl font-bold">{stats.totalRegistrations}</h2>
          </div>
          {/* Add back your gender/dept charts as needed */}
        </div>
      )}
    </div>
  );
}
