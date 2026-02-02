import { useState, useEffect, useRef } from "react";
import { supabase } from "../../lib/supabase";
import html2canvas from "html2canvas";
import {
  TrendingUp,
  Users,
  Award,
  DollarSign,
  Calendar,
  Activity,
  Download,
  BarChart2,
} from "lucide-react"; // Added BarChart2
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

  // New state for chart toggle
  const [categoryChartType, setCategoryChartType] = useState("stacked"); // "stacked" or "bar"

  // Refs for the cards we want to download
  const categoryGraphRef = useRef(null);
  const departmentGraphRef = useRef(null);

  const [stats, setStats] = useState({
    totalRegistrations: 0,
    genderBreakdown: { male: 0, female: 0, other: 0 },
    departmentBreakdown: {},
    eventPopularity: [],
    statusBreakdown: { confirmed: 0, pending: 0, rejected: 0 },
    categoryMetrics: {
      Sports: { count: 0, soet: 0, sop: 0, soa: 0 },
      Technical: { count: 0, soet: 0, sop: 0, soa: 0 },
      Cultural: { count: 0, soet: 0, sop: 0, soa: 0 },
    },
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

  // --- HTML2CANVAS DOWNLOAD HANDLER ---
  const handleDownload = async (e, ref, fileName) => {
    e.preventDefault();
    e.stopPropagation();

    if (!ref.current) return;

    try {
      console.log(`Downloading ${fileName}...`);
      const element = ref.current;

      const canvas = await html2canvas(element, {
        scale: 2,
        backgroundColor: "#ffffff",
        useCORS: true,
        logging: false,
        onclone: clonedDoc => {
          // 1. Hide buttons
          const buttons = clonedDoc.querySelectorAll("button");
          buttons.forEach(btn => (btn.style.display = "none"));

          // 2. Expand scrollable areas so full list captures
          const scrollables = clonedDoc.querySelectorAll(".overflow-y-auto");
          scrollables.forEach(div => {
            div.style.overflow = "visible";
            div.style.maxHeight = "none";
            div.style.height = "auto";
          });
        },
      });

      const image = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = image;
      link.download = `${fileName}_${getFormattedDate()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Export failed:", err);
      alert("Export failed. Check console for details.");
    }
  };

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
      let hasMore = true;

      while (hasMore) {
        let query = supabase
          .from("registrations")
          .select(
            `id, profile:profiles(gender, department, school), event:events(id, name, category)`
          )
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
        if (allData.length >= 15000) hasMore = false;
      }

      const genderBreakdown = { male: 0, female: 0, other: 0 };
      const departmentBreakdown = {};
      const eventStatsMap = {};
      const categoryMetrics = {
        Sports: { count: 0, soet: 0, sop: 0, soa: 0 },
        Technical: { count: 0, soet: 0, sop: 0, soa: 0 },
        Cultural: { count: 0, soet: 0, sop: 0, soa: 0 },
      };

      allData.forEach(reg => {
        const gender = reg.profile?.gender?.toLowerCase() || "other";
        const school = reg.profile?.school?.toUpperCase() || "";
        const category = reg.event?.category;

        genderBreakdown[gender] = (genderBreakdown[gender] || 0) + 1;
        const dept = reg.profile?.department || "Unknown";
        departmentBreakdown[dept] = (departmentBreakdown[dept] || 0) + 1;

        if (category && categoryMetrics[category]) {
          categoryMetrics[category].count += 1;
          if (school.includes("ENGINEERING") || school.includes("SOET"))
            categoryMetrics[category].soet += 1;
          else if (school.includes("PHARMACY") || school.includes("SOP"))
            categoryMetrics[category].sop += 1;
          else if (school.includes("ARCHITECTURE") || school.includes("SOA"))
            categoryMetrics[category].soa += 1;
        }

        if (reg.event) {
          const eventName = reg.event.name;
          if (!eventStatsMap[eventName]) {
            eventStatsMap[eventName] = { name: eventName, count: 0, male: 0, female: 0, other: 0 };
          }
          eventStatsMap[eventName].count += 1;
          if (gender === "male") eventStatsMap[eventName].male += 1;
          else if (gender === "female") eventStatsMap[eventName].female += 1;
        }
      });

      setStats({
        totalRegistrations: total,
        statusBreakdown: { confirmed, pending, rejected },
        genderBreakdown,
        departmentBreakdown,
        categoryMetrics,
        eventPopularity: Object.values(eventStatsMap).sort((a, b) => b.count - a.count),
      });
    } catch (error) {
      console.error(error);
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
        const { data } = await query;
        if (data && data.length > 0) {
          allData = [...allData, ...data];
          from += 1000;
        } else hasMore = false;
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
              otherReg.team_members?.some(m => m.id === reg.profile_id)
          );
        }
        if (isTeamMember) return;
        const fee = reg.event?.fee || 0;
        totalRevenue += fee;
        const mode = reg.payment_mode || "hybrid";
        paymentModeBreakdown[mode] = (paymentModeBreakdown[mode] || 0) + fee;
        if (reg.event) eventRevenue[reg.event.name] = (eventRevenue[reg.event.name] || 0) + fee;
      });
      setPaymentStats({
        totalRevenue,
        paymentModeBreakdown,
        eventRevenue: Object.entries(eventRevenue)
          .map(([name, revenue]) => ({ name, revenue }))
          .sort((a, b) => b.revenue - a.revenue),
      });
    } catch (e) {
      console.error(e);
    }
  };

  // --- COMPONENT FOR STACKED BAR (Original) ---
  const CategoryRow = ({ label, metrics }) => {
    const total = metrics.count || 0;
    const getWidth = count => {
      if (count === 0 && total === 0) return "33.33%";
      if (count === 0) return "40px";
      return `${Math.max((count / total) * 100, 15)}%`;
    };

    return (
      <div className="mb-5 last:mb-0">
        <div className="flex justify-between items-end mb-1">
          <span className="text-sm font-medium capitalize" style={{ color: "#374151" }}>
            {label}
          </span>
          <span className="text-sm font-bold" style={{ color: "#111827" }}>
            {metrics.count}
          </span>
        </div>
        <div
          className="relative w-full rounded-full h-7 flex overflow-hidden border shadow-inner"
          style={{ backgroundColor: "#f3f4f6", borderColor: "#e5e7eb" }}
        >
          <div
            className="h-full flex items-center justify-center text-[9px] font-bold transition-all min-w-[40px]"
            style={{ width: getWidth(metrics.soet), backgroundColor: "#2563eb", color: "#ffffff" }}
          >
            SOET:{metrics.soet}
          </div>
          <div
            className="h-full flex items-center justify-center text-[9px] font-bold border-l transition-all min-w-[40px]"
            style={{
              width: getWidth(metrics.sop),
              backgroundColor: "#22c55e",
              color: "#ffffff",
              borderColor: "rgba(255,255,255,0.2)",
            }}
          >
            SOP:{metrics.sop}
          </div>
          <div
            className="h-full flex items-center justify-center text-[9px] font-bold border-l transition-all min-w-[40px]"
            style={{
              width: getWidth(metrics.soa),
              backgroundColor: "#dc2626",
              color: "#ffffff",
              borderColor: "rgba(255,255,255,0.2)",
            }}
          >
            SOA:{metrics.soa}
          </div>
        </div>
      </div>
    );
  };

  // --- NEW COMPONENT FOR CLUSTERED BAR (Bar Chart) ---
  const ClusteredCategoryRow = ({ label, metrics }) => {
    // Determine max value to scale the bars relative to each other in this row
    const maxVal = Math.max(metrics.soet, metrics.sop, metrics.soa, 1);
    const getBarWidth = count => `${Math.max((count / maxVal) * 100, 2)}%`; // Min width 2% for visibility

    return (
      <div className="mb-6 last:mb-0">
        <div className="flex justify-between items-end mb-2">
          <span className="text-sm font-bold capitalize" style={{ color: "#111827" }}>
            {label}
          </span>
          <span className="text-xs font-medium" style={{ color: "#6b7280" }}>
            Total: {metrics.count}
          </span>
        </div>
        <div className="space-y-1.5 pl-2 border-l-2" style={{ borderColor: "#e5e7eb" }}>
          {/* SOET Bar */}
          <div className="flex items-center gap-2">
            <div
              className="h-4 rounded-r flex items-center justify-end px-1 transition-all duration-500"
              style={{
                width: getBarWidth(metrics.soet),
                backgroundColor: "#2563eb",
                minWidth: "4px",
              }}
            ></div>
            <span className="text-[10px] font-medium" style={{ color: "#4b5563" }}>
              {metrics.soet}
            </span>
          </div>
          {/* SOP Bar */}
          <div className="flex items-center gap-2">
            <div
              className="h-4 rounded-r flex items-center justify-end px-1 transition-all duration-500"
              style={{
                width: getBarWidth(metrics.sop),
                backgroundColor: "#22c55e",
                minWidth: "4px",
              }}
            ></div>
            <span className="text-[10px] font-medium" style={{ color: "#4b5563" }}>
              {metrics.sop}
            </span>
          </div>
          {/* SOA Bar */}
          <div className="flex items-center gap-2">
            <div
              className="h-4 rounded-r flex items-center justify-end px-1 transition-all duration-500"
              style={{
                width: getBarWidth(metrics.soa),
                backgroundColor: "#dc2626",
                minWidth: "4px",
              }}
            ></div>
            <span className="text-[10px] font-medium" style={{ color: "#4b5563" }}>
              {metrics.soa}
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="text-sm text-gray-600 mt-1">Bonhomie 2026 Participation & Revenue</p>
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
            <Download className="h-4 w-4" /> Export Data
          </button>
        </div>
      </div>

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
        <div className="flex items-center justify-center h-64 text-gray-400 animate-pulse font-medium">
          Loading precise analytics...
        </div>
      ) : (
        <>
          {activeTab === "participation" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg p-5 text-white shadow-lg flex flex-col justify-between h-full">
                  <div>
                    <p className="text-xs opacity-90 uppercase font-bold mb-1 tracking-wider">
                      Total Registrations
                    </p>
                    <p className="text-4xl font-bold">{stats.totalRegistrations}</p>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-[10px] text-center mt-6">
                    <div className="bg-white/10 rounded py-2 border border-white/10">
                      CONFIRMED
                      <br />
                      <b className="text-sm">{stats.statusBreakdown.confirmed}</b>
                    </div>
                    <div className="bg-white/10 rounded py-2 border border-white/10">
                      PENDING
                      <br />
                      <b className="text-sm">{stats.statusBreakdown.pending}</b>
                    </div>
                    <div className="bg-white/10 rounded py-2 border border-white/10">
                      REJECTED
                      <br />
                      <b className="text-sm">{stats.statusBreakdown.rejected}</b>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 flex flex-col justify-between h-full">
                  <h3 className="text-xs text-gray-500 font-bold uppercase mb-2">
                    Gender Distribution
                  </h3>
                  <div className="space-y-3">
                    {Object.entries(stats.genderBreakdown).map(([gender, count]) => (
                      <div key={gender} className="flex items-center justify-between">
                        <span className="text-xs font-medium capitalize text-gray-600">
                          {gender}
                        </span>
                        <div className="flex-1 mx-3 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-indigo-600 h-full transition-all"
                            style={{ width: `${(count / stats.totalRegistrations) * 100}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-bold text-gray-900">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 flex items-center justify-between h-full">
                  <div>
                    <p className="text-sm text-gray-500 font-bold uppercase mb-1 tracking-wider">
                      Active Depts
                    </p>
                    <p className="text-4xl font-bold text-gray-900">
                      {Object.keys(stats.departmentBreakdown).length}
                    </p>
                  </div>
                  <Activity className="h-10 w-10 text-purple-500" />
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Category Card */}
                <div
                  ref={categoryGraphRef}
                  className="rounded-lg shadow-sm border p-6 flex flex-col justify-between relative"
                  style={{ backgroundColor: "#ffffff", borderColor: "#e5e7eb" }}
                >
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-semibold" style={{ color: "#111827" }}>
                      Category School Distribution
                    </h3>
                    <div className="flex gap-2">
                      {/* TOGGLE BUTTON FOR CHART TYPE */}
                      <button
                        onClick={() =>
                          setCategoryChartType(prev => (prev === "stacked" ? "bar" : "stacked"))
                        }
                        className="p-2 rounded-full hover:bg-gray-100 transition-all shadow-sm border"
                        style={{
                          backgroundColor: "#f9fafb",
                          color: "#374151",
                          borderColor: "#e5e7eb",
                        }}
                        title="Toggle Chart Type"
                      >
                        <BarChart2 size={18} />
                      </button>
                      <button
                        onClick={e => handleDownload(e, categoryGraphRef, "Category_Distribution")}
                        className="p-2 rounded-full hover:bg-indigo-100 transition-all shadow-sm border"
                        style={{
                          backgroundColor: "#eef2ff",
                          color: "#4f46e5",
                          borderColor: "#e0e7ff",
                        }}
                        title="Download as Image"
                      >
                        <Download size={18} />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-6">
                    {categoryChartType === "stacked" ? (
                      <>
                        <CategoryRow label="Sports" metrics={stats.categoryMetrics.Sports} />
                        <CategoryRow label="Cultural" metrics={stats.categoryMetrics.Cultural} />
                        <CategoryRow label="Technical" metrics={stats.categoryMetrics.Technical} />
                      </>
                    ) : (
                      <>
                        <ClusteredCategoryRow
                          label="Sports"
                          metrics={stats.categoryMetrics.Sports}
                        />
                        <ClusteredCategoryRow
                          label="Cultural"
                          metrics={stats.categoryMetrics.Cultural}
                        />
                        <ClusteredCategoryRow
                          label="Technical"
                          metrics={stats.categoryMetrics.Technical}
                        />
                      </>
                    )}
                  </div>

                  {/* Legend - Only needed for stacked or to explain colors generally */}
                  <div
                    className="flex justify-center gap-6 mt-6 pt-4 border-t"
                    style={{ borderColor: "#f9fafb" }}
                  >
                    <div className="flex items-center gap-1.5">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: "#2563eb" }}
                      ></div>
                      <span className="text-[10px] font-bold" style={{ color: "#6b7280" }}>
                        SOET
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: "#22c55e" }}
                      ></div>
                      <span className="text-[10px] font-bold" style={{ color: "#6b7280" }}>
                        SOP
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: "#dc2626" }}
                      ></div>
                      <span className="text-[10px] font-bold" style={{ color: "#6b7280" }}>
                        SOA
                      </span>
                    </div>
                  </div>
                </div>

                {/* Department Breakdown Card */}
                <div
                  ref={departmentGraphRef}
                  className="rounded-lg shadow-sm border p-6 relative"
                  style={{ backgroundColor: "#ffffff", borderColor: "#e5e7eb" }}
                >
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold" style={{ color: "#111827" }}>
                      Department Breakdown
                    </h3>
                    <button
                      onClick={e => handleDownload(e, departmentGraphRef, "Department_Breakdown")}
                      className="p-2 rounded-full hover:bg-indigo-100 transition-all shadow-sm border"
                      style={{
                        backgroundColor: "#eef2ff",
                        color: "#4f46e5",
                        borderColor: "#e0e7ff",
                      }}
                      title="Download as Image"
                    >
                      <Download size={18} />
                    </button>
                  </div>

                  <div className="space-y-3 max-h-[310px] overflow-y-auto pr-2 custom-scrollbar">
                    {Object.entries(stats.departmentBreakdown)
                      .sort((a, b) => b[1] - a[1])
                      .map(([dept, count]) => (
                        <div
                          key={dept}
                          className="flex justify-between items-center text-sm"
                          style={{ marginBottom: "8px" }}
                        >
                          <span className="font-medium" style={{ color: "#4b5563" }}>
                            {dept}
                          </span>
                          <span
                            style={{
                              backgroundColor: "#eef2ff",
                              color: "#4338ca",
                              borderRadius: "12px",
                              height: "24px",
                              paddingLeft: "12px",
                              paddingRight: "12px",
                              fontSize: "11px",
                              fontWeight: "bold",
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              minWidth: "35px",
                              lineHeight: "1",
                            }}
                          >
                            {count}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              </div>

              {/* Event Registration Ranking Section */}
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
                        <div className="flex justify-between items-center text-sm mb-1 font-medium text-gray-700">
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
                          <div
                            className="bg-blue-500 h-full flex items-center justify-center text-[10px] text-white font-bold transition-all min-w-[20px]"
                            style={{ width: `${event.male > 0 ? Math.max(malePct, 5) : 0}%` }}
                          >
                            M:{event.male}
                          </div>
                          <div
                            className="bg-pink-500 h-full flex items-center justify-center text-[10px] text-white font-bold border-l border-white/20 transition-all min-w-[20px]"
                            style={{ width: `${event.female > 0 ? Math.max(femalePct, 5) : 0}%` }}
                          >
                            F:{event.female}
                          </div>
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
                    ₹{Math.max(0, paymentStats.totalRevenue - 6000).toLocaleString()}
                  </p>
                </div>
                {Object.entries(paymentStats.paymentModeBreakdown).map(([mode, amount]) => {
                  let displayAmount =
                    mode.toLowerCase() === "cash" ? Math.max(0, amount - 6000) : amount;
                  return (
                    <div
                      key={mode}
                      className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
                    >
                      <p className="text-sm text-gray-600 capitalize font-medium">
                        {mode} Payments
                      </p>
                      <p className="text-2xl font-bold mt-2 text-gray-900">
                        ₹{displayAmount.toLocaleString()}
                      </p>
                    </div>
                  );
                })}
              </div>
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 font-semibold text-gray-900">
                  Event Revenue Ranking
                </div>
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr className="text-left text-xs font-bold text-gray-500 uppercase tracking-widest">
                      <th className="px-6 py-3">Rank</th>
                      <th className="px-6 py-3">Event Name</th>
                      <th className="px-6 py-3 text-right">Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {paymentStats.eventRevenue.map((event, idx) => (
                      <tr key={event.name} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 font-bold text-gray-400">#{idx + 1}</td>
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
