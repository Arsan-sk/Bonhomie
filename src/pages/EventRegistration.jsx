import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useDropzone } from "react-dropzone";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { CheckCircle, X, Upload, Loader2, ArrowLeft, AlertCircle } from "lucide-react";
import UserSearchAutocomplete from "../components/registration/UserSearchAutocomplete";

const registrationSchema = z.object({
  transaction_id: z.string().optional(),
  team_members: z
    .array(
      z.object({
        name: z.string().min(1, "Name is required"),
        email: z.string().email("Invalid email"),
        roll_number: z.string().min(1, "Roll number is required"),
      })
    )
    .optional(),
});

export default function EventRegistration() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState(null);
  const [error, setError] = useState("");
  const [paymentMode, setPaymentMode] = useState("hybrid");
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [userProfile, setUserProfile] = useState(null);
  const [genderEligibilityError, setGenderEligibilityError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(registrationSchema),
  });

  useEffect(() => {
    fetchEvent();
    fetchUserProfile();
  }, [id]);

  useEffect(() => {
    if (event && userProfile) {
      checkGenderEligibility(event);
    }
  }, [event, userProfile]);

  const fetchUserProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("gender")
        .eq("id", user.id)
        .single();

      if (error) throw error;
      setUserProfile(data);
    } catch (error) {
      console.error("Error fetching user profile:", error);
    }
  };

  const fetchEvent = async () => {
    try {
      const { data, error } = await supabase.from("events").select("*").eq("id", id).single();

      if (error) throw error;
      setEvent(data);

      // Set initial payment mode based on event settings
      if (data.payment_mode === "cash") {
        setPaymentMode("cash");
      } else if (data.payment_mode === "online") {
        setPaymentMode("hybrid"); // Use 'hybrid' for online payments in student UI
      } else {
        setPaymentMode("hybrid"); // Default to hybrid
      }
    } catch (error) {
      console.error("Error fetching event:", error);
      setError("Failed to load event details");
    } finally {
      setLoading(false);
    }
  };

  const checkGenderEligibility = eventData => {
    if (!userProfile || !eventData.allowed_genders || eventData.allowed_genders.length === 0) {
      setGenderEligibilityError("");
      return true;
    }

    const userGender = userProfile.gender;
    const allowedGenders = eventData.allowed_genders;

    // If both Male and Female are allowed, everyone can register
    if (allowedGenders.includes("Male") && allowedGenders.includes("Female")) {
      setGenderEligibilityError("");
      return true;
    }

    // Check if user's gender matches allowed genders
    if (!allowedGenders.includes(userGender)) {
      if (allowedGenders.includes("Male")) {
        setGenderEligibilityError("⚠️ This event is only for Boys");
      } else if (allowedGenders.includes("Female")) {
        setGenderEligibilityError("⚠️ This event is only for Girls");
      } else {
        setGenderEligibilityError("⚠️ You are not eligible for this event");
      }
      return false;
    }

    setGenderEligibilityError("");
    return true;
  };

  const onDrop = useCallback(acceptedFiles => {
    setFile(acceptedFiles[0]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [] },
    maxFiles: 1,
  });

  const onSubmit = async data => {
    // Validate based on payment mode
    if (paymentMode === "hybrid" && !file) {
      setError("Payment screenshot is required for online payment");
      return;
    }

    if (paymentMode === "hybrid" && !data.transaction_id) {
      setError("Transaction ID is required for online payment");
      return;
    }

    // Validate team size
    if (event.subcategory === "Group") {
      const totalSize = selectedMembers.length + 1; // +1 for leader
      if (totalSize < event.min_team_size) {
        setError(
          `Min team size is ${event.min_team_size} (including you). Currently: ${totalSize}`
        );
        return;
      }
      if (totalSize > event.max_team_size) {
        setError(`Maximum team size is ${event.max_team_size} (including you)`);
        return;
      }
    }

    setUploading(true);
    setError("");

    try {
      // 🔒 DUPLICATE REGISTRATION CHECK
      // Check if current user is already registered for this event
      const { data: existingUserReg, error: userCheckError } = await supabase
        .from("registrations")
        .select("id")
        .eq("event_id", event.id)
        .eq("profile_id", user.id)
        .maybeSingle();

      if (userCheckError) throw userCheckError;

      if (existingUserReg) {
        setError("You are already registered for this event!");
        setUploading(false);
        return;
      }

      // Check if any selected team members are already registered
      if (selectedMembers.length > 0) {
        const memberIds = selectedMembers.map(m => m.id);
        const { data: existingMemberRegs, error: memberCheckError } = await supabase
          .from("registrations")
          .select("id, profile_id, profile:profiles(full_name)")
          .eq("event_id", event.id)
          .in("profile_id", memberIds);

        if (memberCheckError) throw memberCheckError;

        if (existingMemberRegs && existingMemberRegs.length > 0) {
          const alreadyRegistered = existingMemberRegs
            .map(r => r.profile?.full_name || "Unknown")
            .join(", ");
          setError(
            `The following team member(s) are already registered for this event: ${alreadyRegistered}`
          );
          setUploading(false);
          return;
        }
      }

      let paymentScreenshotPath = null;

      // Upload screenshot only for hybrid mode
      if (paymentMode === "hybrid" && file) {
        const fileExt = file.name.split(".").pop();
        const fileName = `${user.id}/${event.id}_${Date.now()}.${fileExt}`;
        const { error: uploadError, data: uploadData } = await supabase.storage
          .from("payment_proofs")
          .upload(fileName, file);

        if (uploadError) throw uploadError;
        paymentScreenshotPath = uploadData.path;
      }

      // 1. Create LEADER registration
      const { error: leaderError } = await supabase.from("registrations").insert({
        profile_id: user.id, // LEADER
        event_id: event.id,
        transaction_id: data.transaction_id || null,
        payment_screenshot_path: paymentScreenshotPath,
        team_members: selectedMembers, // Store full member details
        payment_mode: paymentMode,
        status: "pending",
      });

      if (leaderError) throw leaderError;

      // 2. Create MEMBER registrations (for each selected team member)
      if (selectedMembers.length > 0) {
        const memberRegistrations = selectedMembers.map(member => ({
          profile_id: member.id, // MEMBER profile_id
          event_id: event.id,
          payment_mode: paymentMode,
          transaction_id: null, // Only leader has transaction
          payment_screenshot_path: null, // Only leader uploads proof
          team_members: [], // Members don't store team data
          status: "pending", // Same as leader
        }));

        const { error: memberError } = await supabase
          .from("registrations")
          .insert(memberRegistrations);

        if (memberError) throw memberError;
      }

      // 3. Redirect based on context
      const isStudentContext = location.pathname.startsWith("/student");
      const isCoordinatorContext = location.pathname.startsWith("/coordinator");

      if (isStudentContext) {
        navigate(`/student/events/${id}`);
      } else if (isCoordinatorContext) {
        navigate(`/coordinator/browse-events/${id}`);
      } else {
        navigate(`/events/${id}`);
      }
    } catch (err) {
      console.error("Registration error:", err);
      setError(err.message || "Failed to register. Please check your connection and try again.");
    } finally {
      setUploading(false);
    }
  };

  const addTeamMember = () => {
    const currentMembers = teamMembers || [];
    if (currentMembers.length + 1 >= event.max_team_size) return; // +1 for self
    setValue("team_members", [...currentMembers, { name: "", email: "", roll_number: "" }]);
  };

  const removeTeamMember = index => {
    const currentMembers = teamMembers || [];
    setValue(
      "team_members",
      currentMembers.filter((_, i) => i !== index)
    );
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;
  if (!event) return <div className="p-8 text-center">Event not found</div>;

  return (
    <div className="max-w-3xl mx-auto py-8">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeft className="h-5 w-5 mr-2" /> Back to Event
      </button>

      <div className="bg-white shadow sm:rounded-lg overflow-hidden">
        <div className="px-4 py-5 sm:px-6 bg-gray-50 border-b border-gray-200">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Register for {event.name}</h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            Complete the form below to register.
          </p>
        </div>
        <div className="px-4 py-5 sm:p-6">
          {/* Gender Eligibility Warning */}
          {genderEligibilityError && (
            <div className="mb-6 rounded-md bg-red-50 p-4 border border-red-200">
              <div className="flex">
                <div className="flex-shrink-0">
                  <AlertCircle className="h-5 w-5 text-red-400" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Not Eligible</h3>
                  <div className="mt-2 text-sm text-red-700">
                    <p>{genderEligibilityError}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Payment Mode Selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">Payment Mode</label>

              {/* Payment mode restriction message */}
              {event.payment_mode === "cash" && (
                <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-md">
                  <p className="text-sm text-amber-700">💵 This event accepts cash payments only</p>
                </div>
              )}
              {event.payment_mode === "online" && (
                <div className="mb-3 p-3 bg-indigo-50 border border-indigo-200 rounded-md">
                  <p className="text-sm text-indigo-700">
                    📱 This event accepts online payments only
                  </p>
                </div>
              )}

              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setPaymentMode("cash")}
                  disabled={event.payment_mode === "online"}
                  className={`p-3 border-2 rounded-lg text-sm font-medium transition ${
                    paymentMode === "cash"
                      ? "border-green-500 bg-green-50 text-green-700"
                      : "border-gray-200"
                  } ${event.payment_mode === "online" ? "opacity-40 cursor-not-allowed" : ""}`}
                >
                  💵 Cash
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMode("hybrid")}
                  disabled={event.payment_mode === "cash"}
                  className={`p-3 border-2 rounded-lg text-sm font-medium transition ${
                    paymentMode === "hybrid"
                      ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                      : "border-gray-200"
                  } ${event.payment_mode === "cash" ? "opacity-40 cursor-not-allowed" : ""}`}
                >
                  📱 Online (UPI)
                </button>
                <button
                  type="button"
                  disabled
                  className="p-3 border-2 rounded-lg border-gray-200 bg-gray-50 opacity-50 text-sm"
                >
                  ⚡ Auto-Pay (Soon)
                </button>
              </div>
            </div>

            {/* Cash Mode Info */}
            {paymentMode === "cash" && (
              <div className="bg-green-50 p-4 rounded-md border border-green-200">
                <p className="text-sm text-green-700">
                  Fee: <strong>₹{event.fee}</strong> - Pay in cash to coordinator
                </p>
              </div>
            )}

            {paymentMode === "hybrid" && (
              <div className="bg-indigo-50 p-4 rounded-md border border-indigo-100">
                <h4 className="text-sm font-medium text-indigo-800 mb-2">Payment Details</h4>

                {/* QR Code Display */}
                {event.qr_code_path && (
                  <div className="flex justify-center mb-4">
                    <img
                      src={event.qr_code_path}
                      alt="Payment QR Code"
                      className="w-48 h-48 object-contain border-2 border-blue-200 rounded-lg shadow-sm bg-white"
                    />
                  </div>
                )}

                <p className="text-sm text-indigo-700">
                  Registration Fee: <strong className="text-lg">₹{event.fee}</strong>
                </p>
                <p className="text-sm text-indigo-700 mt-1">
                  Pay to UPI ID:
                  <a
                    href={`upi://pay?pa=${event.upi_id || "bonhomei@upi"}&pn=${encodeURIComponent(event.event_name || "Event")}&am=${event.fee}&cu=INR`}
                    className="font-mono bg-gray-100 hover:bg-gray-200 text-indigo-800 px-2 py-0.5 rounded transition-all cursor-pointer underline decoration-dotted"
                    title="Click to open in UPI app"
                  >
                    {event.upi_id || "bonhomei@upi"}
                  </a>
                </p>
              </div>
            )}

            {/* Transaction ID - Only for hybrid */}
            {paymentMode === "hybrid" && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Transaction ID</label>
                <input
                  type="text"
                  {...register("transaction_id")}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm border p-2"
                  placeholder="Enter UPI Transaction ID"
                />
                {errors.transaction_id && (
                  <p className="text-red-500 text-xs mt-1">{errors.transaction_id.message}</p>
                )}
              </div>
            )}

            {/* Screenshot Upload - Only for hybrid */}
            {paymentMode === "hybrid" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Screenshot
                </label>
                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-md p-6 text-center cursor-pointer transition-colors ${
                    isDragActive
                      ? "border-primary bg-blue-50"
                      : "border-gray-300 hover:border-gray-400"
                  }`}
                >
                  <input {...getInputProps()} />
                  {file ? (
                    <div className="flex items-center justify-center space-x-2">
                      <span className="text-sm text-gray-900 font-medium">{file.name}</span>
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          setFile(null);
                        }}
                        className="text-red-500 hover:text-red-700"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-1 text-center">
                      <Upload className="mx-auto h-12 w-12 text-gray-400" />
                      <p className="text-sm text-gray-600">Drag & drop or click to upload</p>
                      <p className="text-xs text-gray-500">PNG, JPG up to 5MB</p>
                    </div>
                  )}
                </div>
                {file && (
                  <p className="mt-2 text-xs text-green-600 flex items-center justify-center">
                    <CheckCircle className="h-3 w-3 mr-1" /> File selected
                  </p>
                )}
              </div>
            )}

            {/* Team Members (if Group) */}
            {event.subcategory === "Group" && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <label className="block text-sm font-medium text-gray-700">
                    Team Members ({selectedMembers.length + 1}/{event.max_team_size})
                  </label>
                </div>

                {/* User Search */}
                {selectedMembers.length + 1 < event.max_team_size && (
                  <div className="mb-4">
                    <UserSearchAutocomplete
                      onSelect={user => {
                        setSelectedMembers([...selectedMembers, user]);
                      }}
                      excludeIds={selectedMembers.map(m => m.id)}
                      currentUserId={user.id}
                    />
                  </div>
                )}

                {/* Selected Members List */}
                {selectedMembers.length > 0 && (
                  <div className="space-y-2">
                    {selectedMembers.map((member, idx) => (
                      <div
                        key={member.id}
                        className="flex items-center justify-between bg-gray-50 p-3 rounded-lg border border-gray-200"
                      >
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{member.full_name}</p>
                          <p className="text-xs text-gray-500">
                            {member.roll_number} • {member.college_email}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedMembers(selectedMembers.filter((_, i) => i !== idx))
                          }
                          className="text-red-500 hover:text-red-700 p-1.5"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <p className="mt-2 text-xs text-gray-500">
                  Team Size: {event.min_team_size} - {event.max_team_size} members (including you).
                </p>
              </div>
            )}

            {error && (
              <div className="rounded-md bg-red-50 p-4">
                <div className="flex">
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">Error</h3>
                    <div className="mt-2 text-sm text-red-700">
                      <p>{error}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="pt-4">
              <button
                type="submit"
                disabled={uploading || genderEligibilityError}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-md text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                {uploading ? (
                  <>
                    <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5" />
                    Submitting...
                  </>
                ) : genderEligibilityError ? (
                  "Not Eligible for This Event"
                ) : (
                  "Submit Registration"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
