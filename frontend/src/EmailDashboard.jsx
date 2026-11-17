import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Archive,
  ArrowDownWideNarrow,
  ArrowLeft,
  ArrowUpRight,
  CalendarClock,
  CalendarDays,
  ChevronDown,
  Check,
  CheckCheck,
  CheckCircle2,
  Clock3,
  Download,
  FileText,
  Filter,
  LogIn,
  LogOut,
  MessageCircle,
  MoreHorizontal,
  Paperclip,
  Plus,
  RefreshCw,
  Reply,
  Search,
  Send,
  Star,
  Trash2,
  X,
} from "lucide-react";
import {
  disconnectGmail,
  downloadGmailAttachment,
  getGmailMessages,
  getGmailStatus,
  sendGmailReply,
  updateGmailMessages,
} from "./gmail-api.js";
import "./EmailDashboard.css";

const EmailAnalytics = React.lazy(() => import("./EmailAnalytics.jsx"));

const minutesAgo = (minutes) =>
  new Date(Date.now() - minutes * 60 * 1000).toISOString();
const hoursFromNow = (hours) =>
  new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();

const initialEmails = [
  {
    id: "mail-1",
    category: "Projects",
    sender: "Olivia Chen",
    address: "olivia@northstar.design",
    initials: "OC",
    color: "#b86b56",
    subject: "Final review: Northstar launch assets",
    summary:
      "Olivia is looking for final approval on the launch deck before the 3 pm handoff.",
    timestamp: minutesAgo(12),
    unread: true,
    important: true,
    starred: false,
    actionRequired: true,
    priority: "High",
    deadline: hoursFromNow(3),
    body: [
      "Hi Alex,",
      "The final launch assets are ready for review. I incorporated the feedback from yesterday and added the updated product screenshots to the deck.",
      "Could you take a look and send your approval before our 3 pm handoff? If anything needs another pass, just leave a comment in the review doc.",
      "Thanks so much,\nOlivia",
    ],
    attachments: ["Northstar-launch-review.pdf", "Launch-assets.zip"],
    insights: [
      "Approval is needed before the 3 pm handoff.",
      "The latest product screenshots are included.",
    ],
  },
  {
    id: "mail-2",
    category: "Finance",
    sender: "Marcus Reed",
    address: "marcus@fieldwork.co",
    initials: "MR",
    color: "#627b9a",
    subject: "Re: Q4 planning — can you confirm the numbers?",
    summary:
      "Marcus needs your confirmation on the revised Q4 budget before tomorrow's planning session.",
    timestamp: minutesAgo(48),
    unread: true,
    important: true,
    starred: true,
    actionRequired: true,
    priority: "High",
    deadline: hoursFromNow(20),
    body: [
      "Hey Alex,",
      "I have updated the Q4 planning sheet with the latest forecast. Could you confirm the design and research budget lines before I share this with the wider team?",
      "Our planning session starts at 10 am tomorrow, so any notes before end of day would be perfect.",
      "Best,\nMarcus",
    ],
    attachments: ["Q4-planning-v3.xlsx"],
    insights: [
      "Two budget lines need confirmation.",
      "The planning session starts tomorrow at 10 am.",
    ],
  },
  {
    id: "mail-3",
    category: "Product",
    sender: "Priya Shah",
    address: "priya@brightpath.io",
    initials: "PS",
    color: "#9b7aa1",
    subject: "The prototype is ready for your feedback",
    summary:
      "A new prototype is ready; Priya would like first-round feedback on the onboarding flow.",
    timestamp: minutesAgo(94),
    unread: true,
    important: false,
    starred: false,
    actionRequired: true,
    priority: "Medium",
    deadline: hoursFromNow(44),
    body: [
      "Hi Alex,",
      "The onboarding prototype is ready for a first look. I focused on simplifying the welcome flow and bringing the account setup into one clear step.",
      "When you have a moment, could you share any initial reactions? A few bullets are more than enough for this round.",
      "Thank you,\nPriya",
    ],
    attachments: ["Onboarding-prototype.fig"],
    insights: [
      "This is an early feedback request, not final approval.",
      "A short response is sufficient.",
    ],
  },
  {
    id: "mail-4",
    category: "Product",
    sender: "Daniel Kim",
    address: "daniel@studiojunction.com",
    initials: "DK",
    color: "#718b70",
    subject: "Workshop notes and next steps",
    summary:
      "Daniel shared the workshop notes and assigned follow-up items for the product team.",
    timestamp: minutesAgo(185),
    unread: false,
    important: false,
    starred: true,
    actionRequired: false,
    priority: "Low",
    deadline: null,
    body: [
      "Hello team,",
      "Thanks for a thoughtful workshop. I have attached the notes and captured the decisions we made about the first-run experience.",
      "The next step is to review the open questions in section three. I will follow up with a short recap after our Thursday sync.",
      "Daniel",
    ],
    attachments: ["Workshop-notes.docx"],
    insights: ["No reply is needed right now.", "Open questions are in section three."],
  },
  {
    id: "mail-5",
    category: "Finance",
    sender: "Jamie Patel",
    address: "jamie@meridianpartners.com",
    initials: "JP",
    color: "#be8d54",
    subject: "Invoice 1048 — payment due this week",
    summary:
      "Meridian's invoice is due in two days; check the amount and forward it to finance.",
    timestamp: minutesAgo(306),
    unread: false,
    important: true,
    starred: false,
    actionRequired: true,
    priority: "Medium",
    deadline: hoursFromNow(50),
    body: [
      "Hi Alex,",
      "A quick reminder that invoice 1048 for the research sprint is due this week. The statement and payment details are attached.",
      "Please let me know if you need anything else from our side.",
      "Regards,\nJamie",
    ],
    attachments: ["Invoice-1048.pdf"],
    insights: [
      "Invoice 1048 is due in two days.",
      "Forward the statement to finance after checking the amount.",
    ],
  },
  {
    id: "mail-6",
    category: "Product",
    sender: "Taylor Brooks",
    address: "taylor@atlasproduct.com",
    initials: "TB",
    color: "#598c89",
    subject: "Quick question about Thursday's demo",
    summary:
      "Taylor is checking whether you can present the updated dashboard in Thursday's demo.",
    timestamp: minutesAgo(390),
    unread: true,
    important: false,
    starred: false,
    actionRequired: true,
    priority: "Medium",
    deadline: hoursFromNow(72),
    body: [
      "Hi Alex,",
      "Would you be able to walk everyone through the new dashboard during Thursday's demo? We have about ten minutes set aside.",
      "Let me know and I will update the agenda.",
      "Taylor",
    ],
    attachments: [],
    insights: ["A yes or no response is needed to finalize the agenda."],
  },
  {
    id: "mail-7",
    category: "Updates",
    sender: "Avery Morgan",
    address: "avery@fieldnotes.org",
    initials: "AM",
    color: "#a85c69",
    subject: "Monthly product digest",
    summary:
      "Avery sent the monthly digest with team updates, shipped improvements, and upcoming events.",
    timestamp: minutesAgo(710),
    unread: false,
    important: false,
    starred: false,
    actionRequired: false,
    priority: "Low",
    deadline: null,
    body: [
      "Hello,",
      "Here is this month's product digest. It includes a recap of shipped improvements, community highlights, and a preview of the next set of experiments.",
      "Feel free to share it with anyone who would find it useful.",
      "Avery",
    ],
    attachments: [],
    insights: ["A newsletter; no action is required."],
  },
  {
    id: "mail-8",
    category: "Marketing",
    sender: "Sam Rivera",
    address: "sam@northstar.design",
    initials: "SR",
    color: "#6d75a6",
    subject: "Could you share the updated brand guidelines?",
    summary:
      "Sam needs the latest brand guidelines before preparing the partner announcement.",
    timestamp: minutesAgo(955),
    unread: true,
    important: false,
    starred: false,
    actionRequired: true,
    priority: "Low",
    deadline: hoursFromNow(120),
    body: [
      "Hi Alex,",
      "I am putting together the partner announcement and want to make sure I use the latest brand guidelines.",
      "Could you send me the current version when you get a chance?",
      "Thanks,\nSam",
    ],
    attachments: [],
    insights: ["Send the current brand guidelines before the partner announcement."],
  },
];

const tabs = ["All", "Unread", "Important", "Starred", "Action Required"];
const priorityRank = { High: 0, Medium: 1, Low: 2 };

function formatTime(date) {
  const parsed = new Date(date);
  const now = new Date();
  if (parsed.toDateString() === now.toDateString()) {
    return parsed.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }
  return parsed.toLocaleDateString([], { month: "short", day: "numeric" });
}

function formatDeadline(date) {
  if (!date) return "";
  const hours = Math.max(0, Math.round((new Date(date) - Date.now()) / 3600000));
  if (hours < 1) return "Due now";
  if (hours < 24) return `Due in ${hours}h`;
  const days = Math.round(hours / 24);
  return days === 1 ? "Due tomorrow" : `Due in ${days} days`;
}

function Avatar({ email, small = false }) {
  return (
    <span
      className={`email-avatar${small ? " email-avatar-small" : ""}`}
      aria-hidden="true"
    >
      {email.initials}
    </span>
  );
}

function SelectMenu({ label, value, options, onChange, className = "" }) {
  const id = React.useId();
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const optionRefs = useRef([]);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const selectedIndex = Math.max(options.indexOf(value), 0);

  useEffect(() => {
    if (!isOpen) return undefined;

    const closeOutside = (event) => {
      if (!rootRef.current?.contains(event.target)) setIsOpen(false);
    };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("focusin", closeOutside);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("focusin", closeOutside);
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) optionRefs.current[activeIndex]?.focus();
  }, [activeIndex, isOpen]);

  const closeMenu = (restoreFocus = false) => {
    setIsOpen(false);
    if (restoreFocus) triggerRef.current?.focus();
  };

  const handleKeyDown = (event) => {
    if (!isOpen) {
      if (
        event.key === "ArrowDown" ||
        event.key === "ArrowUp" ||
        event.key === "Enter" ||
        event.key === " "
      ) {
        event.preventDefault();
        setActiveIndex(selectedIndex);
        setIsOpen(true);
      }
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      closeMenu(true);
    } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const direction = event.key === "ArrowDown" ? 1 : -1;
      setActiveIndex((current) => (current + direction + options.length) % options.length);
    } else if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      setActiveIndex(event.key === "Home" ? 0 : options.length - 1);
    }
  };

  return (
    <div
      className={`email-select-menu ${className}`.trim()}
      ref={rootRef}
      onKeyDown={handleKeyDown}
    >
      <button
        ref={triggerRef}
        type="button"
        className="email-select-trigger"
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={`${id}-options`}
        onClick={() => {
          if (isOpen) {
            closeMenu();
          } else {
            setActiveIndex(selectedIndex);
            setIsOpen(true);
          }
        }}
      >
        <span>{value}</span>
        <ChevronDown size={14} aria-hidden="true" />
      </button>
      {isOpen && (
        <div
          className="email-select-options"
          id={`${id}-options`}
          role="listbox"
          aria-label={label}
        >
          {options.map((option, index) => (
            <button
              ref={(element) => {
                optionRefs.current[index] = element;
              }}
              type="button"
              className={`email-select-option${option === value ? " selected" : ""}`}
              id={`${id}-option-${index}`}
              role="option"
              aria-selected={option === value}
              key={option}
              onClick={() => {
                onChange(option);
                closeMenu(true);
              }}
            >
              <span>{option}</span>
              {option === value && <Check size={15} aria-hidden="true" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function EmailDashboard({ isActive, onClose }) {
  const [emails, setEmails] = useState(initialEmails);
  const [gmailStatus, setGmailStatus] = useState({
    configured: false,
    connected: false,
    emailAddress: "",
    checking: false,
  });
  const [gmailError, setGmailError] = useState("");
  const [disconnecting, setDisconnecting] = useState(false);
  const [activeTab, setActiveTab] = useState("All");
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("All priorities");
  const [dateFilter, setDateFilter] = useState("Any time");
  const [sortBy, setSortBy] = useState("Newest");
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [selectedEmailId, setSelectedEmailId] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [addedIds, setAddedIds] = useState(() => new Set());
  const [toast, setToast] = useState("");
  const toastTimer = useRef(null);
  const refreshTimer = useRef(null);
  const searchInputRef = useRef(null);
  const isMacPlatform =
    typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);
  const searchShortcut = isMacPlatform ? "⌘ K" : "Ctrl K";
  const searchShortcutKey = isMacPlatform ? "Meta+K" : "Control+K";

  const selectedEmail = emails.find((email) => email.id === selectedEmailId);
  const unreadCount = emails.filter((email) => email.unread).length;
  const importantCount = emails.filter((email) => email.important).length;
  const actionCount = emails.filter((email) => email.actionRequired).length;
  const deadlines = emails.filter((email) => email.deadline);
  const priorityBreakdown = ["High", "Medium", "Low"].map((priority) => ({
    label: priority,
    count: emails.filter((email) => email.priority === priority).length,
  }));
  const totalPriorityCount = priorityBreakdown.reduce((total, item) => total + item.count, 0);

  useEffect(() => {
    const badge = document.querySelector("#email-unread-count");
    if (badge) badge.textContent = String(unreadCount);
  }, [unreadCount]);

  useEffect(
    () => () => {
      window.clearTimeout(toastTimer.current);
      window.clearTimeout(refreshTimer.current);
    },
    [],
  );

  useEffect(() => {
    if (!isActive) return undefined;

    let active = true;
    const params = new URLSearchParams(window.location.search);
    const callbackError = params.get("gmail_error");
    if (callbackError) {
      setGmailError(
        callbackError === "access_denied"
          ? "Google denied access. If this app is in testing, add the Google account you used in Google Cloud Console > Google Auth Platform > Audience > Test users, save, then try again. Otherwise, retry and approve the requested Gmail access."
          : callbackError === "missing_refresh_token"
            ? "Google did not issue a refresh token. Revoke this app's access in your Google account, then connect again."
            : "Gmail authorization failed. Check the OAuth settings and try again.",
      );
    } else {
      setGmailError("");
    }
    if (params.has("gmail") || params.has("gmail_error") || params.has("email")) {
      window.history.replaceState(null, "", window.location.pathname);
    }

    setGmailStatus((current) => ({ ...current, checking: true }));
    (async () => {
      let connected = false;
      try {
        const status = await getGmailStatus();
        connected = status.connected;
        if (!active) return;
        setGmailStatus({ ...status, checking: false });

        if (status.connected) {
          const inbox = await getGmailMessages();
          if (!Array.isArray(inbox.messages)) {
            throw new Error("The Gmail backend returned an invalid inbox.");
          }
          if (active) setEmails(inbox.messages);
        } else if (active) {
          setEmails(initialEmails);
        }
      } catch (error) {
        if (!active) return;
        setGmailStatus((current) => ({ ...current, checking: false }));
        if (connected) setEmails([]);
        setGmailError(error.message);
      }
    })();

    return () => {
      active = false;
    };
  }, [isActive]);

  useEffect(() => {
    if (!isActive) return undefined;

    const handleSearchShortcut = (event) => {
      const modifierPressed = isMacPlatform ? event.metaKey : event.ctrlKey;
      if (
        !modifierPressed ||
        event.altKey ||
        event.shiftKey ||
        event.key.toLowerCase() !== "k"
      )
        return;
      event.preventDefault();
      event.stopPropagation();
      searchInputRef.current?.focus();
      searchInputRef.current?.select();
    };

    document.addEventListener("keydown", handleSearchShortcut);
    return () => document.removeEventListener("keydown", handleSearchShortcut);
  }, [isActive, isMacPlatform]);

  const notify = (message) => {
    setToast(message);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(""), 3200);
  };

  const visibleEmails = useMemo(() => {
    const normalizedQuery = search.trim().toLowerCase();
    const filtered = emails.filter((email) => {
      const matchesTab =
        activeTab === "All" ||
        (activeTab === "Unread" && email.unread) ||
        (activeTab === "Important" && email.important) ||
        (activeTab === "Starred" && email.starred) ||
        (activeTab === "Action Required" && email.actionRequired);
      const matchesSearch =
        !normalizedQuery ||
        `${email.sender} ${email.address} ${email.subject} ${email.summary}`
          .toLowerCase()
          .includes(normalizedQuery);
      const matchesPriority =
        priorityFilter === "All priorities" || email.priority === priorityFilter;
      const age = (Date.now() - new Date(email.timestamp).getTime()) / 3600000;
      const matchesDate =
        dateFilter === "Any time" ||
        (dateFilter === "Today" && age < 24) ||
        (dateFilter === "Last 7 days" && age < 24 * 7);
      return matchesTab && matchesSearch && matchesPriority && matchesDate;
    });

    return filtered.sort((a, b) => {
      if (sortBy === "Oldest") return new Date(a.timestamp) - new Date(b.timestamp);
      if (sortBy === "Priority")
        return priorityRank[a.priority] - priorityRank[b.priority];
      return new Date(b.timestamp) - new Date(a.timestamp);
    });
  }, [activeTab, dateFilter, emails, priorityFilter, search, sortBy]);

  const applyEmailAction = (ids, action) => {
    const idSet = new Set(ids);
    if (action === "archive" || action === "trash") {
      setEmails((current) => current.filter((email) => !idSet.has(email.id)));
      setSelectedEmailId((current) => (idSet.has(current) ? null : current));
    } else {
      const updates = {
        markRead: { unread: false },
        markUnread: { unread: true },
        star: { starred: true },
        unstar: { starred: false },
      }[action];
      setEmails((current) =>
        current.map((email) =>
          idSet.has(email.id) ? { ...email, ...updates } : email,
        ),
      );
    }
    setSelectedIds(
      (current) => new Set([...current].filter((id) => !idSet.has(id))),
    );
  };

  const runEmailAction = async (ids, action, successMessage) => {
    const messageIds = [...new Set(ids)];
    if (messageIds.length === 0) return;

    try {
      let succeeded = messageIds;
      let failed = [];
      if (gmailStatus.connected) {
        const result = await updateGmailMessages(messageIds, action);
        if (!Array.isArray(result.succeeded) || !Array.isArray(result.failed)) {
          throw new Error("The Gmail backend returned an invalid action result.");
        }
        succeeded = result.succeeded;
        failed = result.failed;
      }

      if (succeeded.length) applyEmailAction(succeeded, action);
      if (failed.length) {
        const message = `${failed.length} message(s) could not be updated. Successful changes were applied.`;
        setGmailError(message);
        notify(message);
        return;
      }

      setGmailError("");
      if (successMessage) notify(successMessage);
    } catch (error) {
      setGmailError(error.message);
      if (gmailStatus.connected) {
        try {
          const inbox = await getGmailMessages();
          if (!Array.isArray(inbox.messages)) {
            throw new Error("The Gmail backend returned an invalid inbox.");
          }
          setEmails(inbox.messages);
        } catch (refreshError) {
          setGmailError(`${error.message} Inbox refresh failed: ${refreshError.message}`);
        }
      }
      notify("Could not update Gmail messages");
    }
  };

  const toggleEmailFlag = (id, flag) => {
    const email = emails.find((item) => item.id === id);
    if (!email || flag !== "starred") return;
    void runEmailAction(
      [id],
      email.starred ? "unstar" : "star",
      email.starred ? "Star removed" : "Message starred",
    );
  };

  const openEmail = (email) => {
    setSelectedEmailId(email.id);
    if (email.unread) {
      void runEmailAction([email.id], "markRead", "");
    }
  };

  const removeEmails = (ids, action) => {
    const count = ids.size;
    const successMessage =
      action === "trash"
        ? `${count === 1 ? "Message" : "Messages"} moved to Trash`
        : `${count === 1 ? "Message" : "Messages"} archived`;
    void runEmailAction(ids, action, successMessage);
  };

  const selectAll = () => {
    if (visibleEmails.length && visibleEmails.every((email) => selectedIds.has(email.id))) {
      setSelectedIds(new Set());
      return;
    }
    setSelectedIds(new Set(visibleEmails.map((email) => email.id)));
  };

  const bulkMarkRead = () =>
    runEmailAction(selectedIds, "markRead", "Selected messages marked as read");

  const bulkMarkUnread = () =>
    runEmailAction(selectedIds, "markUnread", "Selected messages marked as unread");

  const refreshInbox = async () => {
    if (refreshing) return;
    setRefreshing(true);

    if (gmailStatus.connected) {
      try {
        const inbox = await getGmailMessages();
        if (!Array.isArray(inbox.messages)) {
          throw new Error("The Gmail backend returned an invalid inbox.");
        }
        setEmails(inbox.messages);
        setGmailError("");
        notify("Gmail inbox refreshed");
      } catch (error) {
        setGmailError(error.message);
        notify("Could not refresh the Gmail inbox");
      } finally {
        setRefreshing(false);
      }
      return;
    }

    refreshTimer.current = window.setTimeout(() => {
      setRefreshing(false);
      notify("Inbox refreshed");
    }, 850);
  };

  const handleGmailAction = async () => {
    if (!gmailStatus.connected) {
      window.location.assign("/auth/google");
      return;
    }

    setDisconnecting(true);
    try {
      await disconnectGmail();
      setGmailStatus((current) => ({
        ...current,
        connected: false,
        emailAddress: "",
      }));
      setEmails(initialEmails);
      setSelectedIds(new Set());
      setSelectedEmailId(null);
      setGmailError("");
      notify("Gmail disconnected");
    } catch (error) {
      setGmailError(error.message);
    } finally {
      setDisconnecting(false);
    }
  };

  const handleSendReply = async (email, body) => {
    try {
      const result = await sendGmailReply(email.id, body);
      setGmailError("");
      notify("Reply sent");
      return { ok: true, id: result.id };
    } catch (error) {
      setGmailError(error.message);
      notify("Could not send reply");
      return { ok: false, error: error.message };
    }
  };

  const openAttachment = async (email, attachment) => {
    if (gmailStatus.connected && typeof attachment !== "string") {
      try {
        await downloadGmailAttachment(email.id, attachment.id, attachment.name);
      } catch (error) {
        setGmailError(error.message);
      }
      return;
    }
    notify(`${attachment} is sample content`);
  };

  const addEmailToTasks = (email) => {
    if (addedIds.has(email.id)) return;
    const event = new CustomEvent("workspace:add-task", {
      detail: {
        title: `Reply: ${email.subject}`,
        body: `Follow up with ${email.sender} (${email.address}). ${email.summary}`,
        onComplete: (success) => {
          if (success) {
            setAddedIds((current) => new Set(current).add(email.id));
            notify("Added to your tasks");
          } else {
            notify("Could not save this task");
          }
        },
      },
    });
    document.dispatchEvent(event);
  };

  const dateLabel = new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date());
  const urgentEmails = emails
    .filter((email) => email.actionRequired)
    .sort((a, b) => priorityRank[a.priority] - priorityRank[b.priority])
    .slice(0, 3);

  if (!isActive) return null;

  return (
    <main className="email-dashboard">
      <div className="email-page">
        <header className="email-header">
          <div className="email-title-block">
            <button className="email-back-button" onClick={onClose}>
              <ArrowLeft size={16} />
              Workspace
            </button>
            <p className="email-eyebrow">{dateLabel}</p>
            <h1>Inbox</h1>
          </div>
          <div className="email-header-actions">
            <label className="email-search">
              <Search size={17} aria-hidden="true" />
              <input
                ref={searchInputRef}
                type="search"
                placeholder="Search emails..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                aria-label="Search emails"
                aria-keyshortcuts={searchShortcutKey}
              />
              <kbd>{searchShortcut}</kbd>
            </label>
            <div className="email-select-wrap">
              <CalendarDays size={16} aria-hidden="true" />
              <SelectMenu
                label="Filter by date"
                value={dateFilter}
                onChange={setDateFilter}
                options={["Any time", "Today", "Last 7 days"]}
              />
            </div>
            <button
              className="email-refresh"
              onClick={refreshInbox}
              disabled={refreshing}
            >
              <RefreshCw size={16} className={refreshing ? "is-spinning" : ""} />
              Refresh
            </button>
            <button
              className="email-connect-button"
              onClick={handleGmailAction}
              disabled={
                gmailStatus.checking ||
                disconnecting ||
                (!gmailStatus.connected && !gmailStatus.configured)
              }
              title={
                gmailStatus.configured
                  ? undefined
                  : "Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env first"
              }
            >
              {gmailStatus.connected ? (
                <LogOut size={15} aria-hidden="true" />
              ) : (
                <LogIn size={15} aria-hidden="true" />
              )}
              {disconnecting
                ? "Disconnecting…"
                : gmailStatus.checking
                  ? "Checking…"
                  : gmailStatus.connected
                    ? "Disconnect"
                    : "Connect Gmail"}
            </button>
            <div
              className="email-account"
              title={
                gmailStatus.connected
                  ? `Connected to ${gmailStatus.emailAddress}`
                  : "Sample inbox"
              }
            >
              <span className="email-google-avatar">
                {gmailStatus.emailAddress?.[0]?.toUpperCase() || "G"}
              </span>
              <span className="email-account-copy">
                <strong>{gmailStatus.connected ? "Gmail connected" : "Demo inbox"}</strong>
                <small>
                  {gmailStatus.connected
                    ? gmailStatus.emailAddress
                    : "Sample data only"}
                </small>
              </span>
            </div>
          </div>
        </header>

        {gmailError && (
          <p className="email-gmail-error" role="alert">
            {gmailError}
          </p>
        )}
        {!gmailStatus.configured && !gmailStatus.checking && !gmailStatus.connected && (
          <p className="email-gmail-notice" role="status">
            Add Google OAuth credentials to the local <code>.env</code> file to connect Gmail.
          </p>
        )}

        <section className="email-kpis" aria-label="Email overview">
          {[
            {
              label: "Unread",
              value: unreadCount,
              filter: "Unread",
            },
            {
              label: "Important",
              value: importantCount,
              filter: "Important",
            },
            {
              label: "Needs action",
              value: actionCount,
              filter: "Action Required",
            },
            {
              label: "Deadlines",
              value: deadlines.length,
              filter: "Action Required",
            },
          ].map((card, index) => {
            return (
              <motion.button
                className={`email-kpi-card${activeTab === card.filter ? " selected" : ""}`}
                key={card.label}
                onClick={() => setActiveTab(card.filter)}
                aria-pressed={activeTab === card.filter}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: index * 0.06, duration: 0.28 }}
              >
                <span className="email-kpi-label">{card.label}</span>
                <motion.strong
                  key={card.value}
                  className="email-kpi-value"
                  initial={{ opacity: 0.5 }}
                  animate={{ opacity: 1 }}
                >
                  {card.value}
                </motion.strong>
              </motion.button>
            );
          })}
        </section>

        <section className="email-briefing" aria-label="Today's priority summary">
          <div className="briefing-title">
            <span className="briefing-title-icon" aria-hidden="true">
              <ArrowUpRight size={18} />
            </span>
            <div>
              <span className="email-section-kicker">TODAY</span>
              <h2>Needs attention</h2>
            </div>
          </div>
          <div className="briefing-points">
            <article className="briefing-point briefing-point-featured">
              <div className="briefing-point-heading">
                <ArrowUpRight size={14} aria-hidden="true" />
                <span>Top priority</span>
                {urgentEmails[0] && (
                  <span className={`briefing-priority ${urgentEmails[0].priority.toLowerCase()}`}>
                    {urgentEmails[0].priority}
                  </span>
                )}
              </div>
              <strong className="briefing-value">
                {urgentEmails[0]?.subject ?? "No urgent messages"}
              </strong>
              <small className="briefing-detail">
                {urgentEmails[0]
                  ? `From ${urgentEmails[0].sender}`
                  : "Your inbox is all caught up"}
              </small>
            </article>
            <article className="briefing-point">
              <div className="briefing-point-heading">
                <Reply size={14} aria-hidden="true" />
                <span>Pending replies</span>
              </div>
              <div className="briefing-metric">
                <strong>{actionCount}</strong>
                <span>conversations</span>
              </div>
              <small className="briefing-detail">
                {actionCount ? "Waiting for your response" : "No replies needed"}
              </small>
            </article>
            <article className="briefing-point">
              <div className="briefing-point-heading">
                <CalendarClock size={14} aria-hidden="true" />
                <span>Next deadline</span>
              </div>
              <strong className="briefing-value">
                {deadlines[0] ? formatDeadline(deadlines[0].deadline) : "All clear"}
              </strong>
              <small className="briefing-detail">
                {deadlines[0]?.subject ?? "Nothing due soon"}
              </small>
            </article>
          </div>
        </section>

        <React.Suspense
          fallback={
            <section className="email-analytics email-analytics-loading" aria-live="polite">
              <span className="email-section-kicker">INSIGHTS</span>
              <strong>Loading email analytics…</strong>
            </section>
          }
        >
          <EmailAnalytics
            emails={emails}
            unreadCount={unreadCount}
            priorityBreakdown={priorityBreakdown}
          />
        </React.Suspense>

        <div className="email-workspace">
          <section className="email-list-panel">
            <div className="email-panel-heading">
              <div>
                <span className="email-section-kicker">YOUR WORKSPACE</span>
                <h2>Inbox <span>{emails.length}</span></h2>
              </div>
              <button
                className="email-compose-button"
                onClick={() => notify("New message composition is not implemented yet")}
                disabled={gmailStatus.connected}
                title={
                  gmailStatus.connected
                    ? "New message composition is not implemented yet"
                    : undefined
                }
              >
                <Plus size={16} />
                Compose
              </button>
            </div>

            <div className="email-tabs" role="tablist" aria-label="Email filters">
              {tabs.map((tab) => {
                const count =
                  tab === "Unread"
                    ? unreadCount
                    : tab === "Important"
                      ? importantCount
                      : tab === "Action Required"
                        ? actionCount
                        : null;
                return (
                  <button
                    role="tab"
                    aria-selected={activeTab === tab}
                    className={activeTab === tab ? "selected" : ""}
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                  >
                    {tab}
                    {count ? <span>{count}</span> : null}
                  </button>
                );
              })}
            </div>

            <div className="email-toolbar">
              <div className="email-bulk-tools">
                <label className="email-select-all">
                  <input
                    type="checkbox"
                    checked={
                      visibleEmails.length > 0 &&
                      visibleEmails.every((email) => selectedIds.has(email.id))
                    }
                    onChange={selectAll}
                    aria-label="Select all visible emails"
                  />
                  <span>{selectedIds.size ? `${selectedIds.size} selected` : "Select"}</span>
                </label>
                {selectedIds.size > 0 && (
                  <div className="email-bulk-actions">
                    <button
                      onClick={bulkMarkRead}
                      title="Mark selected as read"
                    >
                      <CheckCheck size={15} />
                      Mark read
                    </button>
                    <button
                      onClick={bulkMarkUnread}
                      title="Mark selected as unread"
                    >
                      <CheckCheck size={15} />
                      Mark unread
                    </button>
                    <button
                      onClick={() => removeEmails(selectedIds, "archive")}
                      title="Archive selected"
                    >
                      <Archive size={15} />
                    </button>
                    <button
                      onClick={() => removeEmails(selectedIds, "trash")}
                      title="Move selected to Trash"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                )}
              </div>
              <div className="email-filters">
                <div className="email-filter-control">
                  <Filter size={14} />
                  <SelectMenu
                    className="email-select-menu-compact"
                    label="Filter by priority"
                    value={priorityFilter}
                    onChange={setPriorityFilter}
                    options={["All priorities", "High", "Medium", "Low"]}
                  />
                </div>
                <div className="email-filter-control">
                  <ArrowDownWideNarrow size={14} />
                  <SelectMenu
                    className="email-select-menu-compact"
                    label="Sort emails"
                    value={sortBy}
                    onChange={setSortBy}
                    options={["Newest", "Oldest", "Priority"]}
                  />
                </div>
                <button
                  className="email-more-button"
                  title="More inbox options"
                  onClick={() => notify("Inbox options")}
                >
                  <MoreHorizontal size={17} />
                </button>
              </div>
            </div>

            <div className="email-list" aria-live="polite">
              {refreshing ? (
                <div className="email-skeleton-list" aria-label="Refreshing inbox">
                  {[0, 1, 2, 3].map((item) => (
                    <div className="email-skeleton" key={item}>
                      <span className="skeleton-avatar" />
                      <span className="skeleton-lines">
                        <i />
                        <i />
                        <i />
                      </span>
                    </div>
                  ))}
                </div>
              ) : visibleEmails.length ? (
                <AnimatePresence initial={false}>
                  {visibleEmails.map((email, index) => (
                    <motion.article
                      className={`email-card${email.unread ? " unread" : ""}`}
                      key={email.id}
                      layout
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -18 }}
                      transition={{ duration: 0.2, delay: Math.min(index * 0.025, 0.15) }}
                    >
                      <input
                        className="email-card-checkbox"
                        type="checkbox"
                        checked={selectedIds.has(email.id)}
                        onChange={() =>
                          setSelectedIds((current) => {
                            const next = new Set(current);
                            if (next.has(email.id)) next.delete(email.id);
                            else next.add(email.id);
                            return next;
                          })
                        }
                        aria-label={`Select email from ${email.sender}`}
                      />
                      <Avatar email={email} />
                      <button
                        className="email-card-main"
                        onClick={() => openEmail(email)}
                      >
                        <span className="email-card-topline">
                          <span className="email-sender">
                            {email.unread && <i className="email-unread-dot" />}
                            {email.sender}
                          </span>
                          <span className="email-time">{formatTime(email.timestamp)}</span>
                        </span>
                        <span className="email-subject">{email.subject}</span>
                        <span className="email-summary">{email.summary}</span>
                        <span className="email-card-meta">
                          <span className={`email-priority ${email.priority.toLowerCase()}`}>
                            {email.priority} priority
                          </span>
                          {email.actionRequired && (
                            <span className="email-action-tag">
                              <Reply size={11} />
                              Reply needed
                            </span>
                          )}
                          {email.deadline && (
                            <span className="email-deadline-tag">
                              <Clock3 size={11} />
                              {formatDeadline(email.deadline)}
                            </span>
                          )}
                          {email.attachments.length > 0 && (
                            <span className="email-attachment-count">
                              <Paperclip size={11} />
                              {email.attachments.length}
                            </span>
                          )}
                        </span>
                      </button>
                      <div className="email-card-actions">
                        <button
                          title={email.starred ? "Remove star" : "Star email"}
                          aria-label={email.starred ? "Remove star" : "Star email"}
                          className={email.starred ? "is-starred" : ""}
                          onClick={() => toggleEmailFlag(email.id, "starred")}
                        >
                          <Star size={15} />
                        </button>
                        <button
                          title="Archive email"
                          aria-label="Archive email"
                          onClick={() => removeEmails(new Set([email.id]), "archive")}
                        >
                          <Archive size={15} />
                        </button>
                        <button
                          title="More email actions"
                          aria-label="More email actions"
                          onClick={() => openEmail(email)}
                        >
                          <MoreHorizontal size={16} />
                        </button>
                      </div>
                    </motion.article>
                  ))}
                </AnimatePresence>
              ) : (
                <div className="email-empty-state">
                  <h3>No emails found</h3>
                  <p>Try a different search or update your filters.</p>
                  <button
                    onClick={() => {
                      setSearch("");
                      setActiveTab("All");
                      setPriorityFilter("All priorities");
                      setDateFilter("Any time");
                    }}
                  >
                    Clear filters
                  </button>
                </div>
              )}
            </div>
          </section>

          <aside className="email-action-center">
            <div className="action-center-heading">
              <div>
                <span className="email-section-kicker">ACTION QUEUE</span>
                <h2>Next up</h2>
              </div>
              <span className="action-center-count">{urgentEmails.length}</span>
            </div>
            <div className="action-center-section">
              <div className="action-center-label">
                <span>Priority follow-ups</span>
                <span>{urgentEmails.length}</span>
              </div>
              <div className="urgent-list">
                {urgentEmails.length ? (
                  urgentEmails.map((email) => (
                    <article className="urgent-card" key={email.id}>
                      <div className="urgent-card-top">
                        <span className={`priority-mark ${email.priority.toLowerCase()}`}>
                          <i />
                          {email.priority}
                        </span>
                        <span className="urgent-deadline">{formatDeadline(email.deadline)}</span>
                      </div>
                      <button
                        className="urgent-subject"
                        onClick={() => openEmail(email)}
                      >
                        {email.subject}
                      </button>
                      <span className="urgent-sender">From {email.sender}</span>
                      <button
                        className={`add-task-button${addedIds.has(email.id) ? " added" : ""}`}
                        onClick={() => addEmailToTasks(email)}
                        disabled={addedIds.has(email.id)}
                      >
                        {addedIds.has(email.id) ? <Check size={14} /> : <Plus size={14} />}
                        {addedIds.has(email.id) ? "Added to tasks" : "Add to Tasks"}
                      </button>
                    </article>
                  ))
                ) : (
                  <div className="action-empty">
                    <CheckCircle2 size={18} />
                    <span>Nothing urgent right now.</span>
                  </div>
                )}
              </div>
            </div>

            <div className="action-center-section deadline-section">
              <div className="action-center-label">
                <span><CalendarClock size={14} /> Coming deadlines</span>
                <button onClick={() => setActiveTab("Action Required")}>View all</button>
              </div>
              {deadlines.slice(0, 3).map((email) => (
                <button
                  className="deadline-row"
                  key={email.id}
                  onClick={() => openEmail(email)}
                >
                  <span className="deadline-copy">
                    <strong>{email.subject}</strong>
                    <small>{email.sender}</small>
                  </span>
                  <span className="deadline-time">{formatDeadline(email.deadline)}</span>
                </button>
              ))}
            </div>

            <section className="email-priority-chart" aria-labelledby="priority-chart-title">
              <div className="priority-chart-heading">
                <div>
                  <span className="email-section-kicker">INBOX BREAKDOWN</span>
                  <h3 id="priority-chart-title">Priority mix</h3>
                </div>
                <span className="priority-chart-total">{totalPriorityCount}</span>
              </div>
              <div className="priority-chart-rows">
                {priorityBreakdown.map((item) => {
                  const percentage = totalPriorityCount
                    ? Math.round((item.count / totalPriorityCount) * 100)
                    : 0;
                  return (
                    <div
                      className={`priority-chart-row ${item.label.toLowerCase()}`}
                      key={item.label}
                    >
                      <span className="priority-chart-label">{item.label}</span>
                      <span
                        className="priority-chart-track"
                        role="img"
                        aria-label={`${item.count} ${item.label.toLowerCase()} priority emails, ${percentage}%`}
                      >
                        <span style={{ width: `${percentage}%` }} />
                      </span>
                      <span className="priority-chart-value">{item.count}</span>
                    </div>
                  );
                })}
              </div>
              <p className="priority-chart-caption">
                {totalPriorityCount ? "Messages grouped by priority" : "No messages to chart"}
              </p>
            </section>

            <div className="suggested-action">
              <div>
                <strong>Next response</strong>
                <p>
                  {urgentEmails[0]
                    ? `${urgentEmails[0].sender} · ${formatDeadline(urgentEmails[0].deadline)}`
                    : "No replies due now."}
                </p>
                {urgentEmails[0] && (
                  <button onClick={() => openEmail(urgentEmails[0])}>
                    Review email <ArrowUpRight size={13} />
                  </button>
                )}
              </div>
            </div>

            <div className="email-sync-note">
              <span className="sync-status-dot" />
              <span>
                {gmailStatus.connected
                  ? "Gmail inbox · Connected"
                  : "Demo inbox · Sample data only"}
              </span>
            </div>
          </aside>
        </div>
      </div>

      <AnimatePresence>
        {selectedEmail && (
          <EmailDetailDrawer
            key={selectedEmail.id}
            email={selectedEmail}
            added={addedIds.has(selectedEmail.id)}
            onClose={() => setSelectedEmailId(null)}
            onAddTask={() => addEmailToTasks(selectedEmail)}
            gmailConnected={gmailStatus.connected}
            onArchive={() =>
              removeEmails(new Set([selectedEmail.id]), "archive")
            }
            onDelete={() =>
              removeEmails(new Set([selectedEmail.id]), "trash")
            }
            onStar={() => toggleEmailFlag(selectedEmail.id, "starred")}
            onReply={(body) =>
              gmailStatus.connected
                ? handleSendReply(selectedEmail, body)
                : notify("Connect Gmail to send a real reply")
            }
            onAttachment={(attachment) => openAttachment(selectedEmail, attachment)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && (
          <motion.div
            className="email-toast"
            role="status"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
          >
            <CheckCircle2 size={16} />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}

function EmailDetailDrawer({
  email,
  added,
  onClose,
  onAddTask,
  gmailConnected,
  onArchive,
  onDelete,
  onStar,
  onReply,
  onAttachment,
}) {
  const [replying, setReplying] = useState(false);
  const [replyBody, setReplyBody] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const [replyError, setReplyError] = useState("");
  const [sentReplies, setSentReplies] = useState([]);

  const handleReplyClick = () => {
    if (!gmailConnected) {
      onReply();
      return;
    }
    setReplying((current) => !current);
    setReplyError("");
  };

  const handleSendReply = async (event) => {
    event.preventDefault();
    setSendingReply(true);
    setReplyError("");
    try {
      const result = await onReply(replyBody);
      if (result.ok) {
        setSentReplies((current) => [
          ...current,
          {
            id: result.id || `reply-${Date.now()}`,
            body: replyBody.trim(),
            timestamp: new Date().toISOString(),
          },
        ]);
        setReplyBody("");
      } else {
        setReplyError(result.error);
      }
    } finally {
      setSendingReply(false);
    }
  };

  return (
    <motion.div
      className="email-drawer-backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <motion.aside
        className="email-detail-drawer"
        role="dialog"
        aria-modal="true"
        aria-label={`Email from ${email.sender}`}
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", stiffness: 330, damping: 34 }}
      >
        <div className="drawer-topbar">
          <button onClick={onClose} aria-label="Close email">
            <X size={18} />
          </button>
          <span>Email details</span>
          <div>
            <button
              onClick={onArchive}
              aria-label="Archive email"
              title="Archive"
            >
              <Archive size={17} />
            </button>
            <button
              onClick={onDelete}
              aria-label="Move email to Trash"
              title="Move to Trash"
            >
              <Trash2 size={17} />
            </button>
            <button
              onClick={onStar}
              aria-label="Toggle star"
              title={email.starred ? "Remove star" : "Star"}
            >
              <Star size={17} />
            </button>
          </div>
        </div>
        <div className="drawer-content">
          <div className="drawer-labels">
            <span className={`email-priority ${email.priority.toLowerCase()}`}>
              {email.priority} priority
            </span>
            {email.actionRequired && (
              <span className="email-action-tag"><Reply size={11} /> Reply needed</span>
            )}
          </div>
          <h2 className="drawer-subject">{email.subject}</h2>
          <section className="drawer-conversation" aria-label="Email conversation">
            <div className="drawer-conversation-heading">
              <span><MessageCircle size={16} /> Conversation</span>
              <span className="drawer-message-count">
                {1 + sentReplies.length} {sentReplies.length ? "messages" : "message"}
              </span>
            </div>
            <div className="drawer-thread">
              <article className="drawer-thread-message incoming">
                <div className="drawer-sender">
                  <Avatar email={email} />
                  <span>
                    <strong>{email.sender}</strong>
                    <small>{email.address}</small>
                  </span>
                  <time>{formatTime(email.timestamp)}</time>
                </div>
                <div className="drawer-message-bubble">
                  {email.body.map((paragraph, index) =>
                    paragraph ? <p key={index}>{paragraph}</p> : <br key={index} />,
                  )}
                </div>
              </article>
              {sentReplies.map((reply) => (
                <article className="drawer-thread-message outgoing" key={reply.id}>
                  <div className="drawer-outgoing-meta">
                    <span>You</span>
                    <time>{formatTime(reply.timestamp)}</time>
                  </div>
                  <div className="drawer-message-bubble">
                    {reply.body.split(/\n\s*\n/).map((paragraph, index) => (
                      <p key={index}>{paragraph}</p>
                    ))}
                  </div>
                  <span className="drawer-sent-status"><CheckCheck size={13} /> Sent</span>
                </article>
              ))}
            </div>
          </section>

          {replying && (
            <form className="drawer-reply-composer" onSubmit={handleSendReply}>
              <label htmlFor="drawer-reply-body">
                Reply to <strong>{email.sender}</strong>
              </label>
              <textarea
                id="drawer-reply-body"
                value={replyBody}
                onChange={(event) => setReplyBody(event.target.value)}
                maxLength={10000}
                rows={5}
                placeholder={`Write a message to ${email.sender}...`}
                required
                disabled={sendingReply}
              />
              {replyError && <p role="alert">{replyError}</p>}
              <div className="drawer-reply-controls">
                <small>{replyBody.length}/10000</small>
                <button
                  type="submit"
                  disabled={sendingReply || !replyBody.trim()}
                >
                  <Send size={15} />
                  {sendingReply ? "Sending..." : "Send reply"}
                </button>
              </div>
            </form>
          )}

          <div className={`drawer-connection-note${gmailConnected ? " connected" : ""}`}>
            <span className="drawer-connection-dot" />
            {gmailConnected
              ? "Replies are sent securely through your connected Gmail"
              : "Connect Gmail to send a real reply"}
          </div>

          {email.attachments.length > 0 && (
            <section className="drawer-attachments">
              <h3><Paperclip size={15} /> Attachments <span>{email.attachments.length}</span></h3>
              <div>
                {email.attachments.map((attachment) => (
                  <button
                    key={
                      typeof attachment === "string"
                        ? attachment
                        : attachment.id
                    }
                    onClick={() => onAttachment(attachment)}
                  >
                    <FileText size={17} />
                    <span>
                      {typeof attachment === "string" ? attachment : attachment.name}
                      <small>
                        {typeof attachment === "string"
                          ? "Sample attachment"
                          : "Download from Gmail"}
                      </small>
                    </span>
                    <Download size={15} />
                  </button>
                ))}
              </div>
            </section>
          )}

          <section className="drawer-insights">
            <h3>Key points</h3>
            <ul>
              {email.insights.map((insight) => (
                <li key={insight}>
                  <span className="insight-mark" aria-hidden="true" />
                  {insight}
                </li>
              ))}
            </ul>
            {email.deadline && (
              <div className="drawer-deadline">
                <span><strong>Deadline</strong><small>{formatDeadline(email.deadline)}</small></span>
              </div>
            )}
          </section>
        </div>
        <div className="drawer-actions">
          <button
            className="drawer-reply-button"
            onClick={handleReplyClick}
            disabled={sendingReply}
          >
            <Reply size={16} /> {replying ? "Close reply" : "Reply"}
          </button>
          <button
            className={`drawer-task-button${added ? " added" : ""}`}
            onClick={onAddTask}
            disabled={added}
          >
            {added ? <Check size={16} /> : <Plus size={16} />}
            {added ? "Added to Tasks" : "Add to Tasks"}
          </button>
        </div>
      </motion.aside>
    </motion.div>
  );
}

export default EmailDashboard;
