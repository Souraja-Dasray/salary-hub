import { useState, useMemo, useEffect, createContext, useContext } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  Cell, PieChart, Pie, Legend,
} from "recharts";
import { rowToEntry, submittedDataToRow } from "./salaryEntryDb.js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase =
  supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

/** Google Form URL — set `VITE_FEEDBACK_FORM_URL` in `.env`; otherwise Feedback opens a mail draft */
const feedbackFormUrl =
  typeof import.meta.env.VITE_FEEDBACK_FORM_URL === "string"
    ? import.meta.env.VITE_FEEDBACK_FORM_URL.trim()
    : "";

const FEEDBACK_MAILTO =
  "mailto:?subject=" +
  encodeURIComponent("Salary Hub feedback") +
  "&body=" +
  encodeURIComponent("What would you improve?\n\n");

function feedbackHref() {
  return feedbackFormUrl || FEEDBACK_MAILTO;
}

function feedbackOpensInNewTab() {
  return /^https?:\/\//i.test(feedbackFormUrl);
}

/* ──────────────────────────────────────────────────────────────
   FONTS
────────────────────────────────────────────────────────────── */
const fontLink = document.createElement("link");
fontLink.rel = "stylesheet";
fontLink.href =
  "https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800;1,9..40,400&family=DM+Mono:wght@400;500&display=swap";
document.head.appendChild(fontLink);

/* ──────────────────────────────────────────────────────────────
   THEME CONTEXT
────────────────────────────────────────────────────────────── */
const ThemeCtx = createContext({ dark: true, toggle: () => {} });
const useTheme = () => useContext(ThemeCtx);

/* ──────────────────────────────────────────────────────────────
   DESIGN TOKENS  (computed per theme)
────────────────────────────────────────────────────────────── */
function tokens(dark) {
  return {
    bg:      dark ? "#0E0E0E" : "#FAFAF8",
    surf:    dark ? "#1A1A1A" : "#FFFFFF",
    surf2:   dark ? "#222222" : "#F4F3EF",
    surf3:   dark ? "#2A2A2A" : "#ECEAE4",
    border:  dark ? "#2C2C2C" : "#E2DFD8",
    border2: dark ? "#383838" : "#D0CCC2",
    text:    dark ? "#F0F0F0" : "#1A1A18",
    text2:   dark ? "#888888" : "#777770",
    text3:   dark ? "#555555" : "#AAAAAA",
    orange:  "#FF9000",
    orangeL: dark ? "#FF900018" : "#FF900012",
    orangeB: dark ? "#FF900033" : "#FF900022",
    green:   "#00C97A",
    blue:    "#3B9EFF",
    purple:  "#A78BFA",
    red:     "#FF5C5C",
  };
}

/* ──────────────────────────────────────────────────────────────
   DATA
────────────────────────────────────────────────────────────── */
const COMPANIES = [
  "Infosys","TCS","Wipro","HCL","Cognizant","Capgemini","Accenture","IBM India",
  "Uber","Atlassian","Gojek","Stripe","Rubrik","Tower Research Capital","Coinbase","NAVI",
  "Google India","Microsoft India","Amazon India","Meta India","Apple India",
  "Adobe India","Salesforce","SAP India","Oracle India","Zepto","Swiggy","Zomato",
  "Meesho","Razorpay","PhonePe","CRED","BharatPe","Groww","Zerodha","Paytm",
  "Flipkart","Myntra","Ola","Nykaa","ShareChat","Urban Company","Delhivery",
  "Goldman Sachs","JP Morgan","Morgan Stanley","Deutsche Bank","Barclays",
  "HSBC","Citi India","Deloitte","McKinsey","BCG","Bain","EY","PwC","KPMG",
];

const ROLES_RAW = [
  // Engineering
  "Software Engineer (SDE-1)","Software Engineer (SDE-2)","Senior Software Engineer (SDE-3)",
  "Staff Engineer","Principal Engineer","Distinguished Engineer",
  "Engineering Manager (EM)","Senior EM","Director of Engineering","VP Engineering","CTO",
  "Frontend Engineer (SDE-1)","Frontend Engineer (SDE-2)","Senior Frontend Engineer",
  "Backend Engineer (SDE-1)","Backend Engineer (SDE-2)","Senior Backend Engineer",
  "Fullstack Engineer (SDE-1)","Fullstack Engineer (SDE-2)",
  "DevOps Engineer (L1)","DevOps Engineer (L2)","Senior DevOps / SRE",
  "Data Engineer (L1)","Data Engineer (L2)","Senior Data Engineer",
  "ML Engineer (L1)","ML Engineer (L2)","Senior ML Engineer","Staff ML Engineer",
  "QA Engineer","Senior QA / SDET","Security Engineer",
  // Product
  "Associate Product Manager (APM)","Product Manager (PM-1)","Product Manager (PM-2)",
  "Senior Product Manager (SPM)","Group PM","Director of Product","VP Product","CPO",
  // Data & Analytics
  "Data Analyst (L1)","Data Analyst (L2)","Senior Data Analyst",
  "Data Scientist (DS-1)","Data Scientist (DS-2)","Senior Data Scientist","Staff Data Scientist",
  "Business Analyst","Senior Business Analyst",
  // Design
  "UX Designer (L1)","UX Designer (L2)","Senior UX Designer","Lead Designer","Design Director",
  // Consulting / Finance
  "Analyst","Senior Analyst","Consultant","Senior Consultant","Manager","Senior Manager",
  "Associate","Associate Director","Director","VP","AVP","SVP","MD","Partner",
  // Others
  "Customer Success Manager","Account Executive","Marketing Manager",
  "HR Business Partner","Finance Manager","Legal Counsel",
];

const CITIES = ["Bengaluru","Mumbai","Hyderabad","Pune","Chennai","Delhi / NCR","Noida","Gurugram","Kolkata","Ahmedabad","Remote","Hybrid"];
const INDUSTRIES = ["Big Tech","Startup","Fintech","IT Services","Consulting","Finance / Banking","Healthcare","E-Commerce","SaaS","Media & Gaming","Other"];
const IND_LEVELS = {
  "Big Tech":         ["L3","L4","L5","L6","L7","L8","M1","M2","Director","VP"],
  "Startup":          ["IC1","IC2","IC3","IC4","IC5","EM1","EM2","Director","VP","C-Suite"],
  "Fintech":          ["SDE-1","SDE-2","SDE-3","Staff","Principal","EM","Sr. EM","Director"],
  "IT Services":      ["Analyst","Sr. Analyst","Consultant","Sr. Consultant","Manager","Sr. Manager","Director"],
  "Consulting":       ["Analyst","Associate","Engagement Manager","Principal","Partner"],
  "Finance / Banking":["Analyst","Associate","VP","ED","MD"],
  "default":          ["Junior","Mid","Senior","Lead","Principal","Manager","Director","VP","C-Suite"],
};
const BENEFITS_LIST = [
  { id:"food",      icon:"🍱", label:"Free Food" },
  { id:"commute",   icon:"🚌", label:"Commute" },
  { id:"phone",     icon:"📱", label:"Phone & Internet" },
  { id:"wellness",  icon:"🧘", label:"Wellness Reimbursement" },
  { id:"gym",       icon:"💪", label:"Gym / Fitness" },
  { id:"insurance", icon:"🏥", label:"Health Insurance (family)" },
  { id:"lifeins",   icon:"🛡️",  label:"Life Insurance" },
  { id:"learning",  icon:"📚", label:"L&D Budget" },
  { id:"wfh",       icon:"🏠", label:"WFH Setup Allowance" },
  { id:"travel",    icon:"✈️",  label:"Travel Allowance" },
  { id:"creche",    icon:"👶", label:"Creche / Childcare" },
  { id:"reloc",     icon:"📦", label:"Relocation Bonus" },
  { id:"pto",       icon:"🏖️",  label:"Flexible PTO" },
  { id:"eap",       icon:"🧠", label:"Mental Health / EAP" },
  { id:"sodexo",    icon:"🎟️",  label:"Meal Vouchers" },
];
const VESTING = [
  "1-yr cliff, 4-yr vest","6-mo cliff, 4-yr vest","No cliff, 4-yr vest",
  "3-yr vest (equal)","4-yr vest (equal)","Immediate","Custom",
];
const SORT_OPTS = ["Newest","Highest CTC","Lowest CTC","Most Experience"];
const TABS      = ["Feed","Charts","Leaderboard"];

/* ──────────────────────────────────────────────────────────────
   SEED DATA
────────────────────────────────────────────────────────────── */
const SEED = [
  { id:1,  company:"Google India",  role:"Software Engineer (SDE-2)", level:"L4", industry:"Big Tech",     base:4500000, variable:500000, joining:500000, joiningClawback:true,  joiningClawbackMonths:"12", retention:0, retentionClawback:false, retentionClawbackMonths:"12", hasEquity:true,  equityType:"RSU", esopGrants:6000000, esopValue:1500000, vestingSchedule:"1-yr cliff, 4-yr vest", variableNote:"", esopNote:"", benefits:["food","gym","insurance","learning","wfh"], yoe:6, location:"Hyderabad", notes:"", date:"2026-04-29" },
  { id:2,  company:"Zepto",         role:"Product Manager (PM-2)",    level:"IC4", industry:"Startup",     base:3200000, variable:480000, joining:300000, joiningClawback:false, joiningClawbackMonths:"12", retention:0, retentionClawback:false, retentionClawbackMonths:"12", hasEquity:true,  equityType:"ESOP",esopGrants:3200000, esopValue:800000,  vestingSchedule:"1-yr cliff, 4-yr vest", variableNote:"Paid quarterly", esopNote:"", benefits:["food","commute","insurance","wellness","phone"], yoe:4, location:"Mumbai",    notes:"", date:"2026-04-27" },
  { id:3,  company:"Goldman Sachs", role:"Analyst",                   level:"Analyst", industry:"Finance / Banking", base:2200000, variable:600000, joining:0, joiningClawback:false, joiningClawbackMonths:"12", retention:0, retentionClawback:false, retentionClawbackMonths:"12", hasEquity:false, equityType:"", esopGrants:0, esopValue:0, vestingSchedule:"", variableNote:"Discretionary", esopNote:"", benefits:["insurance","lifeins","eap"], yoe:2, location:"Bengaluru", notes:"", date:"2026-04-25" },
  { id:4,  company:"Razorpay",      role:"Senior Backend Engineer",   level:"SDE-3",   industry:"Fintech",  base:3000000, variable:300000, joining:200000, joiningClawback:true,  joiningClawbackMonths:"12", retention:0, retentionClawback:false, retentionClawbackMonths:"12", hasEquity:true,  equityType:"ESOP",esopGrants:2400000, esopValue:600000, vestingSchedule:"1-yr cliff, 4-yr vest", variableNote:"", esopNote:"Current valuation ₹320/share", benefits:["food","insurance","gym","learning"], yoe:4, location:"Bengaluru", notes:"", date:"2026-04-22" },
  { id:5,  company:"TCS",           role:"Software Engineer (SDE-1)", level:"C2",      industry:"IT Services",base:700000,variable:50000, joining:0, joiningClawback:false,  joiningClawbackMonths:"12", retention:0, retentionClawback:false, retentionClawbackMonths:"12", hasEquity:false, equityType:"",esopGrants:0,esopValue:0,vestingSchedule:"",variableNote:"",esopNote:"", benefits:["food","commute","insurance"], yoe:2, location:"Chennai", notes:"", date:"2026-04-20" },
  { id:6,  company:"Microsoft India",role:"Senior Software Engineer (SDE-3)",level:"62",industry:"Big Tech",base:4200000,variable:420000,joining:0,joiningClawback:false,joiningClawbackMonths:"12",retention:400000,retentionClawback:true,retentionClawbackMonths:"12",hasEquity:true,equityType:"RSU",esopGrants:4800000,esopValue:1200000,vestingSchedule:"1-yr cliff, 4-yr vest",variableNote:"",esopNote:"",benefits:["food","gym","insurance","learning","wfh","wellness","eap"],yoe:5,location:"Hyderabad",notes:"",date:"2026-04-18"},
  { id:7,  company:"PhonePe",       role:"Backend Engineer (SDE-3)",  level:"SDE-3",  industry:"Fintech",  base:3800000,variable:380000,joining:0,joiningClawback:false,joiningClawbackMonths:"12",retention:0,retentionClawback:false,retentionClawbackMonths:"12",hasEquity:true,equityType:"ESOP",esopGrants:3600000,esopValue:900000,vestingSchedule:"1-yr cliff, 4-yr vest",variableNote:"",esopNote:"",benefits:["food","insurance","gym","phone"],yoe:5,location:"Bengaluru",notes:"",date:"2026-04-15"},
  { id:8,  company:"Deloitte",      role:"Senior Consultant",         level:"Senior", industry:"Consulting",base:1600000,variable:320000,joining:0,joiningClawback:false,joiningClawbackMonths:"12",retention:0,retentionClawback:false,retentionClawbackMonths:"12",hasEquity:false,equityType:"",esopGrants:0,esopValue:0,vestingSchedule:"",variableNote:"",esopNote:"",benefits:["insurance","travel","learning"],yoe:4,location:"Mumbai",notes:"",date:"2026-04-12"},
  { id:9,  company:"Swiggy",        role:"Data Scientist (DS-2)",     level:"IC3",    industry:"Startup",  base:2800000,variable:280000,joining:150000,joiningClawback:false,joiningClawbackMonths:"12",retention:0,retentionClawback:false,retentionClawbackMonths:"12",hasEquity:true,equityType:"ESOP",esopGrants:1600000,esopValue:400000,vestingSchedule:"1-yr cliff, 4-yr vest",variableNote:"",esopNote:"",benefits:["food","insurance","wellness"],yoe:3,location:"Bengaluru",notes:"",date:"2026-04-08"},
  { id:10, company:"Infosys",       role:"Senior Software Engineer (SDE-3)",level:"SSE",industry:"IT Services",base:1800000,variable:180000,joining:0,joiningClawback:false,joiningClawbackMonths:"12",retention:0,retentionClawback:false,retentionClawbackMonths:"12",hasEquity:false,equityType:"",esopGrants:0,esopValue:0,vestingSchedule:"",variableNote:"",esopNote:"",benefits:["commute","insurance","food"],yoe:5,location:"Bengaluru",notes:"",date:"2026-04-05"},
  { id:11, company:"CRED",          role:"Senior UX Designer",        level:"L4",     industry:"Fintech",  base:2600000,variable:260000,joining:200000,joiningClawback:false,joiningClawbackMonths:"12",retention:0,retentionClawback:false,retentionClawbackMonths:"12",hasEquity:true,equityType:"ESOP",esopGrants:2000000,esopValue:500000,vestingSchedule:"1-yr cliff, 4-yr vest",variableNote:"",esopNote:"",benefits:["food","wellness","insurance","gym"],yoe:3,location:"Bengaluru",notes:"",date:"2026-04-02"},
  { id:12, company:"Amazon India",  role:"Software Engineer (SDE-2)", level:"SDE-2",  industry:"Big Tech", base:3900000,variable:390000,joining:0,joiningClawback:false,joiningClawbackMonths:"12",retention:0,retentionClawback:false,retentionClawbackMonths:"12",hasEquity:true,equityType:"RSU",esopGrants:3200000,esopValue:800000,vestingSchedule:"1-yr cliff, 4-yr vest",variableNote:"",esopNote:"",benefits:["food","gym","insurance","learning","wfh"],yoe:4,location:"Bengaluru",notes:"",date:"2026-03-30"},
  { id:13, company:"Uber", role:"Software Engineer (SDE-2)", level:"L4", industry:"Big Tech",
    base:4460000, variable:600000, joining:800000, joiningClawback:false, joiningClawbackMonths:"12",
    retention:0, retentionClawback:false, retentionClawbackMonths:"12",
    hasEquity:true, equityType:"RSU", esopGrants:5800000, esopValue:1450000,
    vestingSchedule:"4-yr vest (equal)",
    variableNote:"Target ₹6L at 100%; max ₹12L stated.",
    esopNote:"~$79k USD RSU grant; ~₹14.5L/yr India value @ ~25% annual vest.",
    benefits:["food","insurance","wellness","phone"],
    yoe:4, location:"Bengaluru",
    notes:"Source: anonymous survey. YoE 3.5 yrs (shown as 4); prior exp product-based. Fixed ₹44.6L (₹42L base + ~₹2.6L PF). Sign-on ₹5L + relocation ₹3L (combined in Joining). Gratuity ~₹1.1L. First-year TC reported ~₹71L; steady-state ~₹66L+ from year 2. Prior role TC ~₹28L. Perks: ~₹7.5L medical, $50/mo Uber credits, ₹3k/mo mobile / device program, ₹4.8k/mo wellness, 17% ride discount, onsite food. City not specified — defaulted to Bengaluru.",
    date:"2026-05-01" },

  { id:14, company:"Atlassian", role:"Software Engineer (SDE-2)", level:"P4", industry:"SaaS", base:3700000, variable:350000, joining:0, joiningClawback:false, joiningClawbackMonths:"12", retention:0, retentionClawback:false, retentionClawbackMonths:"12", hasEquity:true, equityType:"RSU", esopGrants:6720000, esopValue:1680000, vestingSchedule:"1-yr cliff, 4-yr vest", variableNote:"Target bonus ₹3.5L.", esopNote:"$90k USD / 4yr; ~₹16.8L/yr annualised.", benefits:["food","insurance","learning","wellness"], yoe:4, location:"Bengaluru", notes:"Anonymous survey. YoE 3.5; prior product-based; Tier I education. Fixed ₹37L incl PF. Current TC ~₹28L. Total steady ~₹58L stated.", date:"2022-06-01" },

  { id:15, company:"Amazon India", role:"Software Engineer (SDE-2)", level:"L5", industry:"Big Tech", base:3600000, variable:0, joining:2200000, joiningClawback:false, joiningClawbackMonths:"12", retention:0, retentionClawback:false, retentionClawbackMonths:"12", hasEquity:true, equityType:"RSU", esopGrants:12000000, esopValue:2500000, vestingSchedule:"Custom", variableNote:"Target bonus N/A for offer.", esopNote:"25 RSUs; vest 5%, 15%, 40%, 40%. ₹16L second-year signing noted separately (not in Joining field).", benefits:["food","insurance","commute","sodexo"], yoe:4, location:"Bengaluru", notes:"Anonymous survey. YoE 3.5; Tier 1 CS; prior product-based. Joining ₹22L Y1 + ₹16L Y2 (Y2 in notes only). Total ~₹61L amortised / 4y stated. Benefits: ₹5L medical, ₹1100/mo meal, ₹1250/mo broadband.", date:"2024-03-01" },

  { id:16, company:"Gojek", role:"Senior Software Engineer (SDE-3)", level:"IC III", industry:"Startup", base:3600000, variable:700000, joining:0, joiningClawback:false, joiningClawbackMonths:"12", retention:0, retentionClawback:false, retentionClawbackMonths:"12", hasEquity:true, equityType:"RSU", esopGrants:2400000, esopValue:750000, vestingSchedule:"1-yr cliff, 4-yr vest", variableNote:"Target ₹7L; up to ~₹14L stated.", esopNote:"$40k USD / 4yr; ~₹7.5L/yr. IPO timing speculative.", benefits:["wellness","phone","learning","reloc"], yoe:4, location:"Bengaluru", notes:"Anonymous survey. Offer Q1 2021. PF + gratuity ~₹2.5L (in notes). Bachelor tier-1 CS. Total ~₹53L yearly stated.", date:"2021-03-01" },

  { id:17, company:"CRED", role:"Backend Engineer (SDE-2)", level:"SDE II", industry:"Fintech", base:3800000, variable:0, joining:0, joiningClawback:false, joiningClawbackMonths:"12", retention:0, retentionClawback:false, retentionClawbackMonths:"12", hasEquity:true, equityType:"ESOP", esopGrants:13500000, esopValue:337500, vestingSchedule:"1-yr cliff, 4-yr vest", variableNote:"No separate variable; mostly fixed.", esopNote:"₹13.5L Series C grant over 4y; ~₹3.375L/yr.", benefits:["insurance","food","wellness"], yoe:4, location:"Bengaluru", notes:"Anonymous survey. Offer Q1 2021. BTech Tier 3. Total ₹41.375L / yr stated (₹38L liquid). Buyback / valuation upside noted by submitter.", date:"2021-03-01" },

  { id:18, company:"Stripe", role:"Software Engineer (SDE-2)", level:"L2", industry:"Fintech", base:4400000, variable:440000, joining:1100000, joiningClawback:false, joiningClawbackMonths:"12", retention:0, retentionClawback:false, retentionClawbackMonths:"12", hasEquity:true, equityType:"RSU", esopGrants:11600000, esopValue:2900000, vestingSchedule:"1-yr cliff, 4-yr vest", variableNote:"10% of base (~₹4.4L).", esopNote:"~$35k USD / yr; ~₹29L/yr India value cited.", benefits:["insurance","wellness","food"], yoe:4, location:"Bengaluru", notes:"Anonymous survey. Offer Nov 2023. YoE 3–4y; Tier 3 BTech CS. Prior FAANG SDE1. Total ~₹77L + ₹11L one-time signing stated.", date:"2023-11-01" },

  { id:19, company:"Rubrik", role:"Senior Software Engineer (SDE-3)", level:"G6", industry:"SaaS", base:4500000, variable:675000, joining:540000, joiningClawback:false, joiningClawbackMonths:"12", retention:0, retentionClawback:false, retentionClawbackMonths:"12", hasEquity:true, equityType:"RSU", esopGrants:11700000, esopValue:2435000, vestingSchedule:"4-yr vest (equal)", variableNote:"15% target (~₹6.75L).", esopNote:"3900 units ~$30/sh; 25%/yr vest.", benefits:["insurance","food","learning"], yoe:3, location:"Bengaluru", notes:"Anonymous survey. June 2024. M.Tech Tier 1; ~3y YoE. Y1 TC ~₹81.5L; steady ~₹76.1L stated.", date:"2024-06-01" },

  { id:20, company:"Google India", role:"Software Engineer (SDE-2)", level:"L4", industry:"Big Tech", base:3760000, variable:564000, joining:550000, joiningClawback:false, joiningClawbackMonths:"12", retention:0, retentionClawback:false, retentionClawbackMonths:"12", hasEquity:true, equityType:"RSU", esopGrants:12200000, esopValue:3076000, vestingSchedule:"Custom", variableNote:"15% target (~₹5.64L).", esopNote:"$92k USD grant; vest 38%, 32%, 18%, 12%. PF ~₹1.8L separate.", benefits:["food","gym","insurance","learning","wfh"], yoe:4, location:"Bengaluru", notes:"Anonymous survey. Offer June 2024. Y1 ~₹79.5L; Y2 ~₹69.4L stated.", date:"2024-06-01" },

  { id:21, company:"Tower Research Capital", role:"Senior Software Engineer (SDE-3)", level:"Senior", industry:"Finance / Banking", base:6700000, variable:4000000, joining:1500000, joiningClawback:false, joiningClawbackMonths:"12", retention:0, retentionClawback:false, retentionClawbackMonths:"12", hasEquity:false, equityType:"", esopGrants:0, esopValue:0, vestingSchedule:"", variableNote:"Avg bonus ~₹40L/yr stated (high variance).", esopNote:"", benefits:["insurance","food"], yoe:6, location:"Gurugram", notes:"Anonymous survey. Offer Nov 2021. ₹67L base incl PF. Y1 TC ~₹1.22 Cr; steady ~₹1.07 Cr stated. Tier 1 BTech.", date:"2021-11-04" },

  { id:22, company:"Coinbase", role:"Software Engineer (SDE-2)", level:"IC4", industry:"Fintech", base:4900000, variable:250000, joining:500000, joiningClawback:false, joiningClawbackMonths:"12", retention:0, retentionClawback:false, retentionClawbackMonths:"12", hasEquity:true, equityType:"RSU", esopGrants:8600000, esopValue:2158000, vestingSchedule:"1-yr cliff, 4-yr vest", variableNote:"Performance bonus ~₹2.5L.", esopNote:"~$26k USD/yr cited; refresh multiplier possible.", benefits:["insurance","wellness","wfh"], yoe:5, location:"Remote", notes:"Anonymous survey. 2024. Prior Atlassian; YoE ~5.4y. Remote/Bengaluru. Total ~₹75L Y1 stated.", date:"2024-09-01" },

  { id:23, company:"NAVI", role:"Software Engineer (SDE-2)", level:"SDE-2", industry:"Fintech", base:5200000, variable:0, joining:200000, joiningClawback:false, joiningClawbackMonths:"12", retention:0, retentionClawback:false, retentionClawbackMonths:"12", hasEquity:true, equityType:"ESOP", esopGrants:12000000, esopValue:300000, vestingSchedule:"4-yr vest (equal)", variableNote:"", esopNote:"₹12L grant total; ~₹3L/yr (25%/yr over 4y).", benefits:["insurance","food"], yoe:6, location:"Bengaluru", notes:"Anonymous survey. YoE 5.5; prior Salesforce. Total ~₹57L incl benefits stated.", date:"2024-07-01" },

  { id:24, company:"Meesho", role:"Senior Software Engineer (SDE-3)", level:"SDE3", industry:"E-Commerce", base:5400000, variable:0, joining:500000, joiningClawback:false, joiningClawbackMonths:"12", retention:0, retentionClawback:false, retentionClawbackMonths:"12", hasEquity:true, equityType:"ESOP", esopGrants:30000000, esopValue:550000, vestingSchedule:"1-yr cliff, 4-yr vest", variableNote:"", esopNote:"₹30L RSU grant / 4yr vest; ~₹5.5L/yr used for CTC line to match ~₹64.5L submitter total.", benefits:["insurance","food","wellness"], yoe:6, location:"Remote", notes:"Anonymous survey. YoE 5.5; Tier 3 BTech; prior Salesforce. ₹3L+₹2L signing/relo combined in Joining. Remote.", date:"2024-08-01" },
];

/* ──────────────────────────────────────────────────────────────
   HELPERS
────────────────────────────────────────────────────────────── */
function formatCTC(n) {
  if (!n || isNaN(n)) return "₹0";
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)}Cr`;
  if (n >= 100000)   return `₹${(n / 100000).toFixed(1)}L`;
  return `₹${n.toLocaleString("en-IN")}`;
}
function formatL(n) {
  if (!n) return "0";
  if (n >= 100000) return `${(n / 100000).toFixed(0)}L`;
  return `${(n / 1000).toFixed(0)}k`;
}
function parse(v) { return parseInt(String(v || "").replace(/,/g, "")) || 0; }
function totalCTC(e) {
  return (e.base||0)+(e.variable||0)+(e.joining||0)+(e.retention||0)+(e.esopValue||0);
}
function timeAgo(d) {
  const diff = Math.floor((new Date() - new Date(d)) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff < 30)  return `${diff}d ago`;
  return `${Math.floor(diff / 30)}mo ago`;
}
function median(arr) {
  const s = [...arr].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/** Case-insensitive substring match (SQL LIKE %q%) across common fields */
function foldCase(s) {
  return String(s ?? "").toLocaleLowerCase("en-IN");
}
function entryMatchesSearch(entry, queryRaw) {
  const q = queryRaw.trim();
  if (!q) return true;
  const fq = foldCase(q);
  const fields = [entry.company, entry.role, entry.location, entry.industry, entry.level];
  return fields.some((f) => foldCase(f).includes(fq));
}

function yoeInBucket(yoe, bucket) {
  if (bucket === "any") return true;
  const y = Number(yoe) || 0;
  if (bucket === "0-2") return y <= 2;
  if (bucket === "3-5") return y >= 3 && y <= 5;
  if (bucket === "6-8") return y >= 6 && y <= 8;
  if (bucket === "9+") return y >= 9;
  return true;
}

/** Resolve typed company to canonical name from dataset (exact match, else unique substring). */
function resolveCompanyQuery(entries, raw) {
  const q = foldCase(raw.trim());
  if (!q) return null;
  const canon = [...new Set(entries.map((e) => e.company))];
  const exact = canon.find((c) => foldCase(c) === q);
  if (exact) return exact;
  const subs = canon.filter((c) => foldCase(c).includes(q));
  if (subs.length === 1) return subs[0];
  return null;
}

const KYW_FEATURED = "__featured__";
const KYW_YOE_OPTS = [
  { key: "any", label: "All experience" },
  { key: "0-2", label: "0–2 yrs" },
  { key: "3-5", label: "3–5 yrs" },
  { key: "6-8", label: "6–8 yrs" },
  { key: "9+", label: "9+ yrs" },
];
const LEVEL_CUSTOM_KYW = "__custom__";

function useMediaQuery(query) {
  const [matches, setMatches] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia(query).matches : false);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setMatches(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, [query]);
  return matches;
}
const IND_ACCENT = {
  "Big Tech":         "#FF9000",
  "Startup":          "#00C97A",
  "Fintech":          "#3B9EFF",
  "IT Services":      "#A78BFA",
  "Finance / Banking":"#F472B6",
  "Consulting":       "#FACC15",
  "Healthcare":       "#34D399",
  "E-Commerce":       "#FB7185",
  "SaaS":             "#60A5FA",
  "Media & Gaming":   "#C084FC",
  "Other":            "#94A3B8",
};
const accent = ind => IND_ACCENT[ind] || "#FF9000";

/* ──────────────────────────────────────────────────────────────
   SHARED UI PRIMITIVES
────────────────────────────────────────────────────────────── */
function Logo({ size = 20 }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:0, userSelect:"none" }}>
      <span style={{ fontFamily:"'DM Sans',sans-serif", fontWeight:800, fontSize:size, color:"inherit", letterSpacing:"-0.03em", lineHeight:1 }}>Salary</span>
      <span style={{ fontFamily:"'DM Sans',sans-serif", fontWeight:800, fontSize:size, color:"#0E0E0E", background:"#FF9000", padding:`${size*0.15}px ${size*0.45}px`, borderRadius:size*0.3, marginLeft:4, letterSpacing:"-0.02em", lineHeight:1 }}>Hub</span>
    </div>
  );
}

function Beta() {
  return (
    <span style={{ fontSize:10, fontWeight:700, letterSpacing:"0.12em", color:"#FF9000", background:"#FF900018", border:"1px solid #FF900033", padding:"2px 7px", borderRadius:20, verticalAlign:"middle" }}>
      BETA
    </span>
  );
}

function Chip({ text, color, bg }) {
  return (
    <span style={{ fontSize:11, fontWeight:600, padding:"3px 9px", borderRadius:20, background: bg || `${color}18`, color, border:`1px solid ${color}30`, whiteSpace:"nowrap" }}>
      {text}
    </span>
  );
}

function useT() {
  const { dark } = useTheme();
  return tokens(dark);
}

function Input({ label, hint, prefix, suffix, type = "text", style: s, ...props }) {
  const t = useT();
  const base = {
    width:"100%", boxSizing:"border-box",
    background:t.surf2, border:`1.5px solid ${t.border}`,
    borderRadius:10, padding:`11px ${suffix?36:14}px 11px ${prefix?28:14}px`,
    fontSize:13, color:t.text, outline:"none",
    fontFamily:"'DM Sans',sans-serif", transition:"border-color 0.15s",
    ...s,
  };
  return (
    <div>
      {label && <FieldLabel text={label} hint={hint} />}
      <div style={{ position:"relative" }}>
        {prefix && <span style={{ position:"absolute", left:11, top:"50%", transform:"translateY(-50%)", color:t.text3, fontSize:13, fontFamily:"'DM Mono',monospace", pointerEvents:"none" }}>{prefix}</span>}
        <input type={type} style={base} {...props} />
        {suffix && <span style={{ position:"absolute", right:11, top:"50%", transform:"translateY(-50%)", color:t.text3, fontSize:11, fontFamily:"'DM Mono',monospace", pointerEvents:"none" }}>{suffix}</span>}
      </div>
    </div>
  );
}

function Select({ label, hint, children, ...props }) {
  const t = useT();
  return (
    <div>
      {label && <FieldLabel text={label} hint={hint} />}
      <select style={{
        width:"100%", boxSizing:"border-box",
        background:t.surf2, border:`1.5px solid ${t.border}`,
        borderRadius:10, padding:"11px 32px 11px 14px", fontSize:13, color:t.text,
        outline:"none", cursor:"pointer", fontFamily:"'DM Sans',sans-serif",
        appearance:"none",
        backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M5 6L0 0h10z' fill='%23888'/%3E%3C/svg%3E")`,
        backgroundRepeat:"no-repeat", backgroundPosition:"right 12px center",
      }} {...props}>
        {children}
      </select>
    </div>
  );
}

function FieldLabel({ text, hint }) {
  const t = useT();
  return (
    <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:6 }}>
      <span style={{ fontSize:11, fontWeight:700, color:t.text2, letterSpacing:"0.07em", textTransform:"uppercase" }}>{text}</span>
      {hint && <span style={{ fontSize:10, color:t.text3, fontStyle:"italic" }}>{hint}</span>}
    </div>
  );
}

function Toggle({ checked, onChange, label, sublabel }) {
  const t = useT();
  return (
    <div onClick={() => onChange(!checked)} style={{
      display:"flex", alignItems:"center", justifyContent:"space-between",
      background: checked ? `${t.orange}15` : t.surf2,
      border:`1.5px solid ${checked ? t.orange : t.border}`,
      borderRadius:10, padding:"11px 14px", cursor:"pointer", transition:"all 0.18s",
    }}>
      <div>
        <div style={{ fontSize:13, fontWeight:600, color: checked ? t.text : t.text2 }}>{label}</div>
        {sublabel && <div style={{ fontSize:11, color:t.text3, marginTop:2 }}>{sublabel}</div>}
      </div>
      <div style={{ width:36, height:20, borderRadius:10, background: checked ? t.orange : t.border, position:"relative", transition:"background 0.18s", flexShrink:0 }}>
        <div style={{ position:"absolute", top:2, left: checked?18:2, width:16, height:16, borderRadius:"50%", background:"#fff", transition:"left 0.18s", boxShadow:"0 1px 4px rgba(0,0,0,0.3)" }} />
      </div>
    </div>
  );
}

function Autocomplete({ label, hint, options, value, onChange, placeholder }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const filtered = value.length > 0
    ? options.filter(o => foldCase(o).includes(foldCase(value)) && o !== value).slice(0, 8)
    : [];
  return (
    <div style={{ position:"relative" }}>
      {label && <FieldLabel text={label} hint={hint} />}
      <input
        value={value} placeholder={placeholder}
        onChange={e => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        style={{
          width:"100%", boxSizing:"border-box",
          background:t.surf2, border:`1.5px solid ${t.border}`,
          borderRadius:10, padding:"11px 14px", fontSize:13, color:t.text,
          outline:"none", fontFamily:"'DM Sans',sans-serif",
        }}
      />
      {open && filtered.length > 0 && (
        <div style={{
          position:"absolute", top:"calc(100% + 4px)", left:0, right:0,
          background:t.surf, border:`1.5px solid ${t.border}`,
          borderRadius:10, zIndex:999, overflow:"hidden",
          boxShadow:`0 8px 32px rgba(0,0,0,${t === tokens(true) ? "0.5" : "0.12"})`,
        }}>
          {filtered.map(o => (
            <div key={o} onMouseDown={() => { onChange(o); setOpen(false); }}
              style={{ padding:"10px 14px", fontSize:13, color:t.text, cursor:"pointer" }}
              onMouseEnter={e => e.currentTarget.style.background = t.surf2}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
              {o}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────
   CTC BREAKDOWN BAR
────────────────────────────────────────────────────────────── */
function BreakdownBar({ entry }) {
  const t = useT();
  const total = totalCTC(entry);
  if (!total) return null;
  const segs = [
    { label:"Base",      val:entry.base||0,      color:t.orange },
    { label:"Variable",  val:entry.variable||0,  color:"#FF6B35" },
    { label:"Joining",   val:entry.joining||0,   color:t.blue },
    { label:"Retention", val:entry.retention||0, color:t.purple },
    { label:"ESOP/RSU",  val:entry.esopValue||0, color:t.green },
  ].filter(s => s.val > 0);

  return (
    <div style={{ background:t.surf2, border:`1px solid ${t.border}`, borderRadius:12, padding:"14px 16px", marginBottom:20 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:10 }}>
        <span style={{ fontSize:11, fontWeight:700, color:t.text2, letterSpacing:"0.1em", textTransform:"uppercase" }}>Total CTC</span>
        <span style={{ fontSize:20, fontWeight:800, color:t.orange, fontFamily:"'DM Mono',monospace" }}>{formatCTC(total)}</span>
      </div>
      <div style={{ display:"flex", borderRadius:6, overflow:"hidden", height:7, gap:2, marginBottom:10 }}>
        {segs.map(s => <div key={s.label} style={{ flex:s.val, background:s.color, borderRadius:3, transition:"flex 0.4s" }} />)}
      </div>
      <div style={{ display:"flex", flexWrap:"wrap", gap:"6px 14px" }}>
        {segs.map(s => (
          <div key={s.label} style={{ display:"flex", alignItems:"center", gap:5 }}>
            <div style={{ width:7, height:7, borderRadius:2, background:s.color, flexShrink:0 }} />
            <span style={{ fontSize:11, color:t.text2 }}>{s.label}: </span>
            <span style={{ fontSize:11, color:t.text, fontFamily:"'DM Mono',monospace" }}>{formatCTC(s.val)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────
   VESTING TIMELINE
────────────────────────────────────────────────────────────── */
function VestingTimeline({ schedule, totalGrant }) {
  const t = useT();
  const val = parse(totalGrant);
  if (!val || !schedule) return null;
  const cliffYr = (schedule.match(/(\d+)-yr cliff/) || [])[1];
  const vestYrs = (schedule.match(/(\d+)-yr vest/) || [])[1];
  const cliff = cliffYr ? parseInt(cliffYr) : 0;
  const vest  = vestYrs ? parseInt(vestYrs)  : 4;
  const years = Array.from({ length: vest }, (_, i) => i + 1);
  const getFraction = yr => {
    if (cliff > 0 && yr === cliff) return 0.25;
    if (cliff === 0) return 1 / vest;
    if (yr > cliff) return 0.75 / (vest - cliff);
    return 0;
  };
  return (
    <div style={{ background:t.surf2, border:`1px solid ${t.border}`, borderRadius:10, padding:"14px 16px", marginTop:10 }}>
      <div style={{ fontSize:11, fontWeight:700, color:t.text2, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:10 }}>
        Vesting · {formatCTC(val)} total
      </div>
      <div style={{ display:"flex", gap:6 }}>
        {years.map(yr => {
          const frac = getFraction(yr);
          const amt  = val * frac;
          const isCliff = yr === cliff;
          return (
            <div key={yr} style={{ flex:1, textAlign:"center" }}>
              <div style={{ height:44, background:t.surf3, borderRadius:6, display:"flex", alignItems:"flex-end", overflow:"hidden", border:`1px solid ${amt > 0 ? t.orange + "44" : t.border}` }}>
                {amt > 0 && <div style={{ width:"100%", height:`${frac * 100 * 3}%`, minHeight:4, background:isCliff ? t.orange : t.orange + "aa", borderRadius:"4px 4px 0 0" }} />}
              </div>
              <div style={{ fontSize:9, color:isCliff ? t.orange : t.text3, fontWeight:isCliff?700:400, marginTop:3 }}>Yr {yr}</div>
              <div style={{ fontSize:9, color:t.text3, fontFamily:"'DM Mono',monospace" }}>{amt > 0 ? formatCTC(amt) : "—"}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────
   BENEFIT CHIPS
────────────────────────────────────────────────────────────── */
function BenefitChips({ selected, onToggle }) {
  const t = useT();
  return (
    <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
      {BENEFITS_LIST.map(b => {
        const on = selected.includes(b.id);
        return (
          <button key={b.id} onClick={() => onToggle(b.id)} style={{
            display:"flex", alignItems:"center", gap:5,
            padding:"6px 12px",
            border:`1.5px solid ${on ? t.orange : t.border}`,
            borderRadius:20,
            background: on ? `${t.orange}18` : t.surf2,
            cursor:"pointer", fontSize:12, fontWeight: on ? 700 : 400,
            color: on ? t.text : t.text2,
            fontFamily:"'DM Sans',sans-serif", transition:"all 0.15s",
          }}>
            <span style={{ fontSize:14 }}>{b.icon}</span> {b.label}
          </button>
        );
      })}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────
   SUBMISSION FORM  (multi-step)
────────────────────────────────────────────────────────────── */
const EMPTY_FORM = {
  company:"", role:"", level:"", industry:"", location:"", yoe:"",
  base:"", joining:"", joiningClawback:false, joiningClawbackMonths:"12", hasJoining:false,
  retention:"", retentionClawback:false, retentionClawbackMonths:"12", hasRetention:false,
  variableType:"percentage", variable:"", variablePercent:"", variableNote:"",
  hasEquity:false, equityType:"ESOP", esopGrants:"", esopValue:"", vestingSchedule:"1-yr cliff, 4-yr vest", esopNote:"",
  benefits:[], notes:"",
};
const STEPS = ["Role","Fixed Pay","Variable","Equity","Perks","Review"];
const LEVEL_CUSTOM = "__custom__";

function SubmitForm({ onSubmit, onClose }) {
  const t = useT();
  const narrow = useMediaQuery("(max-width: 640px)");
  const [step, setStep]   = useState(0);
  const [done, setDone]   = useState(false);
  const [form, setForm]   = useState(EMPTY_FORM);
  const [levelCustom, setLevelCustom] = useState(false);
  const F = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const levels = form.industry ? (IND_LEVELS[form.industry] || IND_LEVELS.default) : IND_LEVELS.default;
  const levelSelectVal =
    levelCustom || (form.level && !levels.includes(form.level)) ? LEVEL_CUSTOM : (levels.includes(form.level) ? form.level : "");
  const derivedVariable = form.variableType === "percentage"
    ? Math.round(parse(form.base) * (parseFloat(form.variablePercent) || 0) / 100)
    : parse(form.variable);

  const previewEntry = {
    base: parse(form.base), variable: derivedVariable,
    joining: form.hasJoining ? parse(form.joining) : 0,
    retention: form.hasRetention ? parse(form.retention) : 0,
    esopValue: form.hasEquity ? parse(form.esopValue) : 0,
  };

  const canNext = () => {
    if (step === 0) return form.company && form.role && form.industry && form.location;
    if (step === 1) return parse(form.base) > 0;
    return true;
  };

  function handleSubmit() {
    onSubmit({
      ...form,
      base:      parse(form.base),
      variable:  derivedVariable,
      joining:   form.hasJoining   ? parse(form.joining)   : 0,
      retention: form.hasRetention ? parse(form.retention) : 0,
      esopGrants:form.hasEquity    ? parse(form.esopGrants): 0,
      esopValue: form.hasEquity    ? parse(form.esopValue) : 0,
      yoe:       parseInt(form.yoe) || 0,
      date:      new Date().toISOString().split("T")[0],
    });
    setDone(true);
    setTimeout(() => {
      onClose(); setStep(0); setForm(EMPTY_FORM); setLevelCustom(false); setDone(false);
    }, 2400);
  }

  const pct = (step / (STEPS.length - 1)) * 100;
  const pill = (active, onClick, text) => (
    <button onClick={onClick} style={{
      padding:"7px 14px", border:`1.5px solid ${active ? t.orange : t.border}`,
      borderRadius:20, background: active ? `${t.orange}18` : t.surf2,
      color: active ? t.text : t.text2,
      fontSize:12, fontWeight: active ? 700 : 400,
      cursor:"pointer", fontFamily:"'DM Sans',sans-serif", transition:"all 0.15s",
    }}>{text}</button>
  );

  return (
    <div onClick={e => e.target === e.currentTarget && onClose()}
      style={{ position:"fixed", inset:0, zIndex:200, background:"rgba(0,0,0,0.55)", backdropFilter:"blur(8px)", display:"flex", alignItems:"center", justifyContent:"center", padding: narrow ? 8 : 16 }}>
      <div style={{ background:t.surf, border:`1px solid ${t.border}`, borderRadius:20, width:"100%", maxWidth:560, maxHeight:"92vh", overflowY:"auto", boxShadow:`0 24px 80px rgba(0,0,0,0.5)` }}>

        {/* Progress */}
        <div style={{ height:3, background:t.surf3, borderRadius:"20px 20px 0 0" }}>
          <div style={{ width:`${pct}%`, height:"100%", background:t.orange, transition:"width 0.35s ease", borderRadius:"20px 0 0 0" }} />
        </div>

        {/* Step tabs */}
        <div style={{ display:"flex", borderBottom:`1px solid ${t.border}`, overflowX:"auto" }}>
          {STEPS.map((s, i) => (
            <button key={s} onClick={() => i < step && setStep(i)}
              style={{ flex:"1 0 auto", padding:"10px 6px", background:"none", border:"none",
                cursor: i < step ? "pointer" : "default",
                color: i === step ? t.orange : i < step ? t.text2 : t.text3,
                fontSize:10, fontWeight: i === step ? 800 : 500,
                borderBottom:`2px solid ${i === step ? t.orange : "transparent"}`,
                marginBottom:-1, whiteSpace:"nowrap",
                textTransform:"uppercase", letterSpacing:"0.06em",
                fontFamily:"'DM Sans',sans-serif",
              }}>
              {i < step ? "✓ " : ""}{s}
            </button>
          ))}
        </div>

        <div style={{ padding: narrow ? "18px 16px 16px" : "24px 26px 22px" }}>
          {done ? (
            <div style={{ textAlign:"center", padding:"48px 0" }}>
              <div style={{ fontSize:52, marginBottom:12 }}>🎉</div>
              <div style={{ fontSize:20, fontWeight:800, color:t.green, fontFamily:"'DM Sans',sans-serif" }}>Added anonymously!</div>
              <div style={{ fontSize:13, color:t.text2, marginTop:6 }}>Thanks for keeping it real 🤝</div>
            </div>
          ) : (<>

            {/* Live preview bar */}
            {step >= 1 && <BreakdownBar entry={previewEntry} />}

            {/* ── Step 0: Role ── */}
            {step === 0 && (
              <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
                <StepHead n="1" title="Where do you work?" sub="Start typing — we'll autocomplete" />
                <Autocomplete label="Company" placeholder="e.g. Google India, Zepto…" options={COMPANIES} value={form.company} onChange={v => F("company", v)} />
                <Autocomplete label="Job Title" placeholder="e.g. Software Engineer (SDE-2)…" options={ROLES_RAW} value={form.role} onChange={v => F("role", v)} />
                <div style={{ display:"grid", gridTemplateColumns: narrow ? "1fr" : "1fr 1fr", gap:12 }}>
                  <Select label="Industry" value={form.industry} onChange={e => { F("industry", e.target.value); F("level", ""); setLevelCustom(false); }}>
                    <option value="">Select…</option>
                    {INDUSTRIES.map(i => <option key={i}>{i}</option>)}
                  </Select>
                  <div>
                    <Select label="Level / Band" value={levelSelectVal} onChange={e => {
                      const v = e.target.value;
                      if (v === LEVEL_CUSTOM) { setLevelCustom(true); F("level", ""); }
                      else { setLevelCustom(false); F("level", v); }
                    }}>
                      <option value="">Select…</option>
                      {levels.map(l => <option key={l} value={l}>{l}</option>)}
                      <option value={LEVEL_CUSTOM}>Other (custom)…</option>
                    </Select>
                    {(levelCustom || (form.level && !levels.includes(form.level))) && (
                      <div style={{ marginTop:10 }}>
                        <Input label="Custom level / band" placeholder="e.g. E5, P8, Principal" value={form.level} onChange={e => { F("level", e.target.value); setLevelCustom(true); }} />
                      </div>
                    )}
                  </div>
                </div>
                <div style={{ display:"grid", gridTemplateColumns: narrow ? "1fr" : "1fr 1fr", gap:12 }}>
                  <Select label="City" value={form.location} onChange={e => F("location", e.target.value)}>
                    <option value="">Select…</option>
                    {CITIES.map(c => <option key={c}>{c}</option>)}
                  </Select>
                  <Input label="Years of Experience" type="number" placeholder="5" value={form.yoe} onChange={e => F("yoe", e.target.value)} suffix="yrs" />
                </div>
              </div>
            )}

            {/* ── Step 1: Fixed ── */}
            {step === 1 && (
              <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
                <StepHead n="2" title="Fixed Compensation" sub="Annual amounts in ₹, gross" />
                <Input label="Base / Fixed Salary *" prefix="₹" type="number" placeholder="1800000" value={form.base} onChange={e => F("base", e.target.value)} hint="(per annum)" />
                <div style={{ height:1, background:t.border }} />
                <Toggle checked={form.hasJoining} onChange={v => F("hasJoining", v)} label="Joining Bonus" sublabel="One-time payment on joining" />
                {form.hasJoining && (
                  <div style={{ paddingLeft:12, borderLeft:`2px solid ${t.orange}44`, display:"flex", flexDirection:"column", gap:12 }}>
                    <Input label="Joining Bonus Amount" prefix="₹" type="number" placeholder="500000" value={form.joining} onChange={e => F("joining", e.target.value)} />
                    <Toggle checked={form.joiningClawback} onChange={v => F("joiningClawback", v)} label="Has clawback clause?" sublabel="Employer recovers amount if you leave early" />
                    {form.joiningClawback && (
                      <Select label="Clawback period" value={form.joiningClawbackMonths} onChange={e => F("joiningClawbackMonths", e.target.value)}>
                        {["3","6","9","12","18","24"].map(m => <option key={m} value={m}>{m} months</option>)}
                      </Select>
                    )}
                  </div>
                )}
                <Toggle checked={form.hasRetention} onChange={v => F("hasRetention", v)} label="Retention Bonus" sublabel="Paid after staying a defined period" />
                {form.hasRetention && (
                  <div style={{ paddingLeft:12, borderLeft:`2px solid ${t.purple}44`, display:"flex", flexDirection:"column", gap:12 }}>
                    <Input label="Retention Bonus Amount" prefix="₹" type="number" placeholder="300000" value={form.retention} onChange={e => F("retention", e.target.value)} />
                    <Toggle checked={form.retentionClawback} onChange={v => F("retentionClawback", v)} label="Has clawback clause?" sublabel="Employer recovers amount if you leave early" />
                    {form.retentionClawback && (
                      <Select label="Clawback period" value={form.retentionClawbackMonths} onChange={e => F("retentionClawbackMonths", e.target.value)}>
                        {["3","6","9","12","18","24"].map(m => <option key={m} value={m}>{m} months</option>)}
                      </Select>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ── Step 2: Variable ── */}
            {step === 2 && (
              <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
                <StepHead n="3" title="Variable / Bonus" sub="Target at 100% performance. Leave blank if none." />
                <div>
                  <FieldLabel text="Variable Type" />
                  <div style={{ display:"flex", gap:8 }}>
                    {[{v:"percentage",l:"% of Base"},{v:"fixed",l:"Fixed Amount"}].map(opt => (
                      <button key={opt.v} onClick={() => F("variableType", opt.v)} style={{
                        flex:1, padding:"10px", border:`1.5px solid ${form.variableType===opt.v ? t.orange : t.border}`,
                        borderRadius:10, background: form.variableType===opt.v ? `${t.orange}15` : t.surf2,
                        color: form.variableType===opt.v ? t.text : t.text2,
                        fontFamily:"'DM Sans',sans-serif", fontSize:13, fontWeight:700, cursor:"pointer", transition:"all 0.15s",
                      }}>{opt.l}</button>
                    ))}
                  </div>
                </div>
                {form.variableType === "percentage" ? (
                  <div>
                    <Input label="Target Variable %" type="number" placeholder="20" value={form.variablePercent} onChange={e => F("variablePercent", e.target.value)} suffix="%" />
                    {form.variablePercent && parse(form.base) > 0 && (
                      <div style={{ marginTop:8, padding:"10px 14px", background:t.surf2, borderRadius:8, border:`1px solid ${t.border}` }}>
                        <span style={{ fontSize:12, color:t.text2 }}>= </span>
                        <span style={{ fontSize:15, fontWeight:700, color:t.orange, fontFamily:"'DM Mono',monospace" }}>{formatCTC(derivedVariable)}</span>
                        <span style={{ fontSize:11, color:t.text3, marginLeft:6 }}>at 100% target</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <Input label="Variable Amount" prefix="₹" type="number" placeholder="400000" value={form.variable} onChange={e => F("variable", e.target.value)} hint="(annual, 100% target)" />
                )}
                <Input label="Notes (optional)" placeholder='e.g. "Paid quarterly, capped at 1.5×"' value={form.variableNote} onChange={e => F("variableNote", e.target.value)} />
              </div>
            )}

            {/* ── Step 3: Equity ── */}
            {step === 3 && (
              <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
                <StepHead n="4" title="Equity / ESOPs / RSUs" sub="Enter annualised value for fair comparison" />
                <Toggle checked={form.hasEquity} onChange={v => F("hasEquity", v)} label="Has Equity Component?" sublabel="ESOPs, RSUs, Phantom Shares, etc." />
                {form.hasEquity && (<>
                  <div>
                    <FieldLabel text="Equity Type" />
                    <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                      {["ESOP","RSU","Phantom","SAR","Other"].map(tp => (
                        <button key={tp} onClick={() => F("equityType", tp)} style={{
                          padding:"7px 14px", border:`1.5px solid ${form.equityType===tp ? t.orange : t.border}`,
                          borderRadius:20, background: form.equityType===tp ? `${t.orange}18` : t.surf2,
                          color: form.equityType===tp ? t.text : t.text2,
                          fontSize:12, fontWeight:700, cursor:"pointer",
                          fontFamily:"'DM Sans',sans-serif", transition:"all 0.15s",
                        }}>{tp}</button>
                      ))}
                    </div>
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                    <Input label="Total Grant Value" prefix="₹" type="number" placeholder="4000000"
                      value={form.esopGrants}
                      onChange={e => { F("esopGrants", e.target.value); F("esopValue", String(Math.round(parse(e.target.value)/4))); }}
                      hint="(total over vest)" />
                    <Input label="Annual Value" prefix="₹" type="number" placeholder="auto" value={form.esopValue} onChange={e => F("esopValue", e.target.value)} hint="(grant ÷ 4)" />
                  </div>
                  <Select label="Vesting Schedule" value={form.vestingSchedule} onChange={e => F("vestingSchedule", e.target.value)}>
                    {VESTING.map(v => <option key={v}>{v}</option>)}
                  </Select>
                  <VestingTimeline schedule={form.vestingSchedule} totalGrant={form.esopGrants} />
                  <Input label="Notes (optional)" placeholder='e.g. "Strike ₹200, current val ₹1200"' value={form.esopNote} onChange={e => F("esopNote", e.target.value)} />
                </>)}
              </div>
            )}

            {/* ── Step 4: Perks ── */}
            {step === 4 && (
              <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
                <StepHead n="5" title="Perks & Benefits" sub="Tap all that apply" />
                <BenefitChips selected={form.benefits} onToggle={id => setForm(p => ({ ...p, benefits: p.benefits.includes(id) ? p.benefits.filter(x => x !== id) : [...p.benefits, id] }))} />
                <Input label="Anything else?" placeholder='e.g. "4 days WFH, ₹50k L&D budget"' value={form.notes} onChange={e => F("notes", e.target.value)} />
              </div>
            )}

            {/* ── Step 5: Review ── */}
            {step === 5 && (
              <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
                <StepHead n="6" title="Review & Submit" sub="This is exactly what others will see." />
                <div style={{ background:t.surf2, border:`1px solid ${t.border}`, borderRadius:14, padding:"18px 20px" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:14 }}>
                    <div>
                      <div style={{ fontSize:16, fontWeight:800, color:t.text }}>{form.company}</div>
                      <div style={{ fontSize:12, color:t.text2, marginTop:2 }}>{form.role} · {form.level}</div>
                      <div style={{ fontSize:11, color:t.text3, marginTop:2 }}>{form.industry} · {form.location} · {form.yoe}y exp</div>
                    </div>
                    <div style={{ textAlign:"right" }}>
                      <div style={{ fontSize:22, fontWeight:800, color:t.orange, fontFamily:"'DM Mono',monospace" }}>{formatCTC(totalCTC({ ...previewEntry }))}</div>
                      <div style={{ fontSize:10, color:t.text3, marginTop:2 }}>Total CTC</div>
                    </div>
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                    {[
                      { label:"Base Salary",     val:previewEntry.base,      color:t.orange,  icon:"💰", show:true },
                      { label:"Variable (target)",val:previewEntry.variable, color:"#FF6B35", icon:"🎯", show:previewEntry.variable>0 },
                      { label:"Joining Bonus",    val:previewEntry.joining,  color:t.blue,    icon:"🎁", show:previewEntry.joining>0 },
                      { label:"Retention Bonus",  val:previewEntry.retention,color:t.purple,  icon:"🔒", show:previewEntry.retention>0 },
                      { label:`${form.equityType} / yr`, val:previewEntry.esopValue, color:t.green, icon:"📈", show:previewEntry.esopValue>0 },
                    ].filter(x => x.show).map(item => (
                      <div key={item.label} style={{ background:t.surf3, borderRadius:10, padding:"12px 14px", border:`1px solid ${item.color}22` }}>
                        <div style={{ fontSize:16, marginBottom:4 }}>{item.icon}</div>
                        <div style={{ fontSize:15, fontWeight:700, color:item.color, fontFamily:"'DM Mono',monospace" }}>{formatCTC(item.val)}</div>
                        <div style={{ fontSize:10, color:t.text2, marginTop:2 }}>{item.label}</div>
                      </div>
                    ))}
                  </div>
                  {(form.joiningClawback || form.retentionClawback) && (
                    <div style={{ marginTop:10, padding:"10px 12px", background:"#FF000012", border:"1px solid #FF000030", borderRadius:8 }}>
                      <div style={{ fontSize:11, fontWeight:700, color:t.red, marginBottom:3 }}>⚠️ Clawback clauses present</div>
                      {form.joiningClawback && <div style={{ fontSize:11, color:t.text2 }}>Joining: recoverable within {form.joiningClawbackMonths} months</div>}
                      {form.retentionClawback && <div style={{ fontSize:11, color:t.text2 }}>Retention: recoverable within {form.retentionClawbackMonths} months</div>}
                    </div>
                  )}
                  {form.hasEquity && (
                    <div style={{ marginTop:8, padding:"9px 12px", background:`${t.green}12`, border:`1px solid ${t.green}30`, borderRadius:8 }}>
                      <div style={{ fontSize:11, color:t.green }}>📈 {form.equityType} · {form.vestingSchedule} · Grant: {formatCTC(parse(form.esopGrants))}</div>
                    </div>
                  )}
                  {form.benefits.length > 0 && (
                    <div style={{ marginTop:10, display:"flex", flexWrap:"wrap", gap:5 }}>
                      {form.benefits.map(id => { const b = BENEFITS_LIST.find(x => x.id === id); return b ? <span key={id} style={{ fontSize:11, background:t.surf, border:`1px solid ${t.border}`, borderRadius:20, padding:"3px 10px", color:t.text2 }}>{b.icon} {b.label}</span> : null; })}
                    </div>
                  )}
                </div>
                <p style={{ fontSize:11, color:t.text3, margin:0, lineHeight:1.7 }}>
                  🔒 Fully anonymous · No account required · No personal data stored
                </p>
              </div>
            )}

            {/* Nav buttons */}
            <div style={{ display:"flex", gap:10, marginTop:22 }}>
              {step > 0 && (
                <button onClick={() => setStep(s => s - 1)} style={{ background:t.surf2, color:t.text2, border:`1px solid ${t.border}`, borderRadius:10, padding:"12px 18px", fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>← Back</button>
              )}
              {step < STEPS.length - 1 ? (
                <button onClick={() => canNext() && setStep(s => s + 1)} style={{ flex:1, background: canNext() ? t.orange : t.surf3, color: canNext() ? "#0E0E0E" : t.text3, border:"none", borderRadius:10, padding:"13px", fontSize:14, fontWeight:800, cursor: canNext() ? "pointer" : "not-allowed", fontFamily:"'DM Sans',sans-serif", transition:"all 0.2s", boxShadow: canNext() ? `0 0 20px ${t.orange}44` : "none" }}>Continue →</button>
              ) : (
                <button onClick={handleSubmit} style={{ flex:1, background:t.orange, color:"#0E0E0E", border:"none", borderRadius:10, padding:"13px", fontSize:14, fontWeight:800, cursor:"pointer", fontFamily:"'DM Sans',sans-serif", boxShadow:`0 0 24px ${t.orange}55` }}>
                  🔒 Submit Anonymously
                </button>
              )}
            </div>

            {/* Step dots */}
            <div style={{ display:"flex", justifyContent:"center", gap:5, marginTop:16 }}>
              {STEPS.map((_, i) => (
                <div key={i} style={{ width: i === step ? 18 : 6, height:6, borderRadius:3, background: i === step ? t.orange : i < step ? t.orange + "55" : t.surf3, transition:"all 0.3s" }} />
              ))}
            </div>
          </>)}
        </div>
      </div>
    </div>
  );
}

function StepHead({ n, title, sub }) {
  const t = useT();
  return (
    <div style={{ marginBottom:6 }}>
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:4 }}>
        <div style={{ width:24, height:24, borderRadius:7, background:t.orange, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800, fontSize:11, color:"#0E0E0E", fontFamily:"'DM Mono',monospace", flexShrink:0 }}>{n}</div>
        <div style={{ fontSize:16, fontWeight:800, color:t.text }}>{title}</div>
      </div>
      {sub && <div style={{ fontSize:12, color:t.text2, paddingLeft:34 }}>{sub}</div>}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────
   ENTRY CARD
────────────────────────────────────────────────────────────── */
function EntryCard({ entry, expanded, onClick }) {
  const t    = useT();
  const ac   = accent(entry.industry);
  const tot  = totalCTC(entry);

  return (
    <div onClick={onClick} style={{
      background: t.surf,
      border:`1.5px solid ${expanded ? ac : t.border}`,
      borderRadius:14, padding:"18px 20px",
      cursor:"pointer", transition:"all 0.18s",
      boxShadow: expanded ? `0 0 0 1px ${ac}33, 0 4px 20px rgba(0,0,0,0.08)` : "none",
    }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:12 }}>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:8 }}>
            <div style={{ width:38, height:38, borderRadius:10, background:`${ac}18`, border:`1.5px solid ${ac}44`, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800, fontSize:16, color:ac, fontFamily:"'DM Sans',sans-serif", flexShrink:0 }}>
              {entry.company[0]}
            </div>
            <div>
              <div style={{ fontWeight:700, fontSize:15, color:t.text }}>{entry.company}</div>
              <div style={{ fontSize:12, color:t.text2, marginTop:1 }}>{entry.role}{entry.level ? ` · ${entry.level}` : ""}</div>
            </div>
          </div>
          <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
            <Chip text={entry.industry} color={ac} />
            <Chip text={`📍 ${entry.location}`} color={t.text2} bg={t.surf2} />
            <Chip text={`${entry.yoe}y exp`} color={t.text2} bg={t.surf2} />
            {entry.hasEquity && <Chip text={`📈 ${entry.equityType}`} color={t.green} />}
          </div>
        </div>
        <div style={{ textAlign:"right", flexShrink:0 }}>
          <div style={{ fontSize:21, fontWeight:800, color:ac, fontFamily:"'DM Mono',monospace", letterSpacing:"-0.03em" }}>{formatCTC(tot)}</div>
          <div style={{ fontSize:10, color:t.text3, marginTop:2 }}>Total CTC</div>
          <div style={{ fontSize:10, color:t.text3, marginTop:5 }}>{timeAgo(entry.date)} · {expanded ? "▲" : "▼"}</div>
        </div>
      </div>

      {expanded && (
        <div style={{ marginTop:16, borderTop:`1px solid ${t.border}`, paddingTop:16 }}>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(110px,1fr))", gap:10, marginBottom:12 }}>
            {[
              { label:"Base",       val:entry.base,      color:"#FF9000",  icon:"💰", show:true },
              { label:"Variable",   val:entry.variable,  color:"#FF6B35",  icon:"🎯", show:(entry.variable||0)>0 },
              { label:"Joining",    val:entry.joining,   color:t.blue,     icon:"🎁", show:(entry.joining||0)>0 },
              { label:"Retention",  val:entry.retention, color:t.purple,   icon:"🔒", show:(entry.retention||0)>0 },
              { label:`${entry.equityType||"ESOP"}/yr`, val:entry.esopValue, color:t.green, icon:"📈", show:(entry.esopValue||0)>0 },
            ].filter(x => x.show).map(s => (
              <div key={s.label} style={{ background:t.surf2, borderRadius:10, padding:"12px 10px", textAlign:"center", border:`1px solid ${s.color}22` }}>
                <div style={{ fontSize:16, marginBottom:3 }}>{s.icon}</div>
                <div style={{ fontSize:15, fontWeight:700, color:s.color, fontFamily:"'DM Mono',monospace" }}>{formatCTC(s.val)}</div>
                <div style={{ fontSize:10, color:t.text2, marginTop:2 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Clawbacks */}
          {(entry.joiningClawback || entry.retentionClawback) && (
            <div style={{ padding:"9px 12px", background:"#FF000010", border:"1px solid #FF000025", borderRadius:8, marginBottom:10 }}>
              <div style={{ fontSize:11, fontWeight:700, color:t.red, marginBottom:2 }}>⚠️ Clawback clauses</div>
              {entry.joiningClawback && <div style={{ fontSize:11, color:t.text2 }}>Joining: {entry.joiningClawbackMonths}mo clawback</div>}
              {entry.retentionClawback && <div style={{ fontSize:11, color:t.text2 }}>Retention: {entry.retentionClawbackMonths}mo clawback</div>}
            </div>
          )}

          {/* Equity vesting */}
          {entry.hasEquity && entry.vestingSchedule && (
            <div style={{ padding:"9px 12px", background:`${t.green}10`, border:`1px solid ${t.green}25`, borderRadius:8, marginBottom:10 }}>
              <div style={{ fontSize:11, color:t.green }}>📈 {entry.equityType} · {entry.vestingSchedule} · Grant: {formatCTC(entry.esopGrants)}</div>
            </div>
          )}

          {/* Benefits */}
          {(entry.benefits||[]).length > 0 && (
            <div style={{ display:"flex", flexWrap:"wrap", gap:5 }}>
              {(entry.benefits||[]).map(id => { const b = BENEFITS_LIST.find(x => x.id === id); return b ? <span key={id} style={{ fontSize:11, background:t.surf2, border:`1px solid ${t.border}`, borderRadius:20, padding:"3px 10px", color:t.text2 }}>{b.icon} {b.label}</span> : null; })}
            </div>
          )}
          <div style={{ marginTop:10, fontSize:11, color:t.text3, display:"flex", gap:12 }}>
            <span>🔒 Anonymous</span><span>Posted {timeAgo(entry.date)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────
   FEED TAB
────────────────────────────────────────────────────────────── */
function FeedTab({ entries, omitKnowYourWorth = false }) {
  const t = useT();
  const [filter,   setFilter]   = useState("All");
  const [city,     setCity]     = useState("All");
  const [sort,     setSort]     = useState("Newest");
  const [search,   setSearch]   = useState("");
  const [expanded, setExpanded] = useState(null);

  const filtered = useMemo(() => {
    let d = [...entries];
    if (filter !== "All") d = d.filter(e => e.industry === filter);
    if (city   !== "All") d = d.filter(e => e.location  === city);
    if (search) d = d.filter(e => entryMatchesSearch(e, search));
    if (sort === "Newest")          d.sort((a, b) => new Date(b.date) - new Date(a.date));
    else if (sort === "Highest CTC") d.sort((a, b) => totalCTC(b) - totalCTC(a));
    else if (sort === "Lowest CTC")  d.sort((a, b) => totalCTC(a) - totalCTC(b));
    else if (sort === "Most Experience") d.sort((a, b) => b.yoe - a.yoe);
    return d;
  }, [entries, filter, city, sort, search]);

  const pillBtn = (active, onClick, label) => (
    <button onClick={onClick} style={{
      background: active ? t.orange : t.surf2,
      color:       active ? "#0E0E0E" : t.text2,
      border:`1.5px solid ${active ? t.orange : t.border}`,
      borderRadius:20, padding:"5px 13px",
      fontSize:11, fontWeight: active ? 700 : 500,
      cursor:"pointer", fontFamily:"'DM Sans',sans-serif", transition:"all 0.15s",
    }}>{label}</button>
  );

  return (
    <div>
      {!omitKnowYourWorth && <KnowYourWorthSection entries={entries} />}
      <div style={{ background:t.surf, border:`1px solid ${t.border}`, borderRadius:14, padding:"16px 18px", marginBottom:16 }}>
        <div style={{ display:"flex", gap:10, marginBottom:12, flexWrap:"wrap" }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍  Search company, role, city, industry, level…"
            style={{ flex:"1 1 180px", background:t.surf2, border:`1.5px solid ${t.border}`, borderRadius:10, padding:"9px 14px", fontSize:13, color:t.text, outline:"none", fontFamily:"'DM Sans',sans-serif" }} />
          <select value={sort} onChange={e => setSort(e.target.value)} style={{ background:t.surf2, border:`1.5px solid ${t.border}`, borderRadius:10, padding:"9px 28px 9px 12px", fontSize:13, color:t.text, outline:"none", cursor:"pointer", fontFamily:"'DM Sans',sans-serif", appearance:"none" }}>
            {SORT_OPTS.map(o => <option key={o}>{o}</option>)}
          </select>
        </div>
        <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:8 }}>
          {["All",...INDUSTRIES].map(ind => pillBtn(filter === ind, () => setFilter(ind), ind))}
        </div>
        <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
          {["All",...CITIES].map(c => pillBtn(city === c, () => setCity(c), c))}
        </div>
      </div>
      <div style={{ fontSize:11, color:t.text3, fontWeight:600, marginBottom:12, letterSpacing:"0.06em", textTransform:"uppercase" }}>{filtered.length} entries</div>
      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        {filtered.map(e => <EntryCard key={e.id} entry={e} expanded={expanded === e.id} onClick={() => setExpanded(expanded === e.id ? null : e.id)} />)}
        {filtered.length === 0 && <div style={{ textAlign:"center", padding:"60px 0", color:t.text3, fontSize:14 }}>No results. Try different filters.</div>}
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────
   CHARTS TAB
────────────────────────────────────────────────────────────── */
function ChartCard({ title, children, compact }) {
  const t = useT();
  const p = compact ? "16px 14px" : "20px 22px";
  return (
    <div style={{ background:t.surf, border:`1px solid ${t.border}`, borderRadius:14, padding:p }}>
      <div style={{ fontSize:16, fontWeight:800, color:t.text, marginBottom:16, fontFamily:"'DM Sans',sans-serif" }}>{title}</div>
      {children}
    </div>
  );
}

function ChartsTab({ entries }) {
  const t = useT();
  const narrow = useMediaQuery("(max-width: 640px)");
  const chartH1 = narrow ? 200 : 220;
  const chartH2 = narrow ? 180 : 200;
  const axis = { fontSize: narrow ? 9 : 10, fill:t.text3, fontFamily:"'DM Sans',sans-serif" };

  const byIndustry = useMemo(() => {
    const map = {};
    entries.forEach(e => { if (!map[e.industry]) map[e.industry] = []; map[e.industry].push(totalCTC(e)); });
    return Object.entries(map).map(([name, vals]) => ({ name, avg: Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) })).sort((a, b) => b.avg - a.avg);
  }, [entries]);

  const byYoe = useMemo(() => {
    const b = { "0–2":[], "3–5":[], "6–8":[], "9+":[" "] };
    entries.forEach(e => {
      const tot = totalCTC(e);
      if (e.yoe <= 2) b["0–2"].push(tot);
      else if (e.yoe <= 5) b["3–5"].push(tot);
      else if (e.yoe <= 8) b["6–8"].push(tot);
      else b["9+"].push(tot);
    });
    return Object.entries(b).filter(([, v]) => v.filter(x=>typeof x==="number").length).map(([name, vals]) => {
      const nums = vals.filter(x=>typeof x==="number");
      return { name, median:Math.round(median(nums)), avg:Math.round(nums.reduce((a,b)=>a+b,0)/nums.length) };
    });
  }, [entries]);

  const pie = useMemo(() => {
    const map = {};
    entries.forEach(e => { map[e.industry] = (map[e.industry]||0)+1; });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [entries]);

  const byCity = useMemo(() => {
    const map = {};
    entries.forEach(e => { if(!map[e.location]) map[e.location]=[]; map[e.location].push(totalCTC(e)); });
    return Object.entries(map).map(([name, vals]) => ({ name, avg: Math.round(vals.reduce((a,b)=>a+b,0)/vals.length) })).sort((a,b)=>b.avg-a.avg).slice(0,6);
  }, [entries]);

  const CTip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{ background:t.surf, border:`1px solid ${t.border}`, borderRadius:8, padding:"9px 13px", fontFamily:"'DM Sans',sans-serif", fontSize:12 }}>
        <div style={{ fontWeight:700, color:t.text, marginBottom:3 }}>{label}</div>
        {payload.map(p => <div key={p.name} style={{ color:p.color }}>₹{formatL(p.value)} {p.name}</div>)}
      </div>
    );
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
      <ChartCard title="Average CTC by Industry" compact={narrow}>
        <ResponsiveContainer width="100%" height={chartH1}>
          <BarChart data={byIndustry} barCategoryGap="30%">
            <XAxis dataKey="name" tick={axis} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={formatL} tick={axis} axisLine={false} tickLine={false} width={36} />
            <Tooltip content={<CTip />} cursor={{ fill:`${t.orange}10` }} />
            <Bar dataKey="avg" name="Avg CTC" radius={[6,6,0,0]}>
              {byIndustry.map((e,i) => <Cell key={i} fill={accent(e.name)} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="CTC vs. Experience Band" compact={narrow}>
        <ResponsiveContainer width="100%" height={chartH2}>
          <BarChart data={byYoe} barCategoryGap="25%">
            <XAxis dataKey="name" tick={axis} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={formatL} tick={axis} axisLine={false} tickLine={false} width={36} />
            <Tooltip content={<CTip />} cursor={{ fill:`${t.orange}10` }} />
            <Bar dataKey="median" name="Median" fill={t.orange}        radius={[6,6,0,0]} />
            <Bar dataKey="avg"    name="Average" fill={t.orange+"55"}  radius={[6,6,0,0]} />
            <Legend wrapperStyle={{ fontSize:11, fontFamily:"'DM Sans',sans-serif", color:t.text2 }} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <div style={{ display:"grid", gridTemplateColumns: narrow ? "1fr" : "1fr 1fr", gap:16 }}>
        <ChartCard title="By Industry" compact={narrow}>
          <ResponsiveContainer width="100%" height={chartH2}>
            <PieChart>
              <Pie data={pie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={narrow ? 58 : 70} innerRadius={narrow ? 26 : 32}>
                {pie.map((_, i) => <Cell key={i} fill={accent(pie[i].name)} />)}
              </Pie>
              <Legend wrapperStyle={{ fontSize:10, fontFamily:"'DM Sans',sans-serif", color:t.text2 }} />
              <Tooltip formatter={(v,n) => [`${v} entries`, n]} contentStyle={{ background:t.surf, border:`1px solid ${t.border}`, borderRadius:8, fontFamily:"'DM Sans',sans-serif", fontSize:11 }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Avg CTC by City" compact={narrow}>
          <ResponsiveContainer width="100%" height={chartH2}>
            <BarChart data={byCity} layout="vertical" barCategoryGap="25%">
              <XAxis type="number" tickFormatter={formatL} tick={axis} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={{ ...axis, fill:t.text2 }} axisLine={false} tickLine={false} width={narrow ? 64 : 72} />
              <Tooltip content={<CTip />} cursor={{ fill:`${t.orange}10` }} />
              <Bar dataKey="avg" name="Avg CTC" fill={t.orange} radius={[0,6,6,0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────
   LEADERBOARD TAB
────────────────────────────────────────────────────────────── */
function LeaderboardTab({ entries }) {
  const t = useT();
  const narrow = useMediaQuery("(max-width: 640px)");
  const [metric, setMetric] = useState("avg");
  const medals = ["🥇","🥈","🥉"];
  const METRICS = [{key:"avg",l:"Avg CTC"},{key:"median",l:"Median"},{key:"maxCTC",l:"Max CTC"},{key:"avgBase",l:"Avg Base"}];

  const stats = useMemo(() => {
    const map = {};
    entries.forEach(e => {
      if (!map[e.company]) map[e.company] = { company:e.company, industry:e.industry, totals:[], bases:[], roles:new Set() };
      map[e.company].totals.push(totalCTC(e));
      map[e.company].bases.push(e.base||0);
      map[e.company].roles.add(e.role);
    });
    return Object.values(map).map(c => ({
      company:c.company, industry:c.industry, count:c.totals.length, roles:c.roles.size,
      avg:    Math.round(c.totals.reduce((a,b)=>a+b,0)/c.totals.length),
      median: Math.round(median(c.totals)),
      maxCTC: Math.max(...c.totals),
      avgBase:Math.round(c.bases.reduce((a,b)=>a+b,0)/c.bases.length),
    })).sort((a, b) => b[metric] - a[metric]);
  }, [entries, metric]);

  const maxVal = stats[0]?.[metric] || 1;

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
      <div style={{ background:t.surf, border:`1px solid ${t.border}`, borderRadius:14, padding:"14px 18px" }}>
        <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
          <span style={{ fontSize:11, color:t.text2, fontWeight:700, letterSpacing:"0.08em", textTransform:"uppercase" }}>Rank by:</span>
          {METRICS.map(m => (
            <button key={m.key} onClick={() => setMetric(m.key)} style={{ background: metric===m.key ? t.orange : t.surf2, color: metric===m.key ? "#0E0E0E" : t.text2, border:`1px solid ${metric===m.key ? t.orange : t.border}`, borderRadius:20, padding:"6px 14px", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"'DM Sans',sans-serif", transition:"all 0.15s" }}>{m.l}</button>
          ))}
        </div>
      </div>

      {/* Podium */}
      <div style={{ display:"grid", gridTemplateColumns: narrow ? "1fr" : "repeat(3, 1fr)", gap:12 }}>
        {stats.slice(0,3).map((c,i) => {
          const ac = accent(c.industry);
          return (
            <div key={c.company} style={{ background:t.surf, border:`1.5px solid ${ac}55`, borderRadius:14, padding:"18px 14px", textAlign:"center", boxShadow:`0 4px 20px ${ac}15` }}>
              <div style={{ fontSize:26, marginBottom:8 }}>{medals[i]}</div>
              <div style={{ width:44, height:44, borderRadius:12, background:`${ac}18`, border:`1.5px solid ${ac}44`, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800, fontSize:20, color:ac, margin:"0 auto 8px", fontFamily:"'DM Sans',sans-serif" }}>{c.company[0]}</div>
              <div style={{ fontWeight:700, fontSize:14, color:t.text }}>{c.company}</div>
              <div style={{ fontSize:11, color:t.text2, marginTop:2 }}>{c.count} {c.count===1?"entry":"entries"}</div>
              <div style={{ fontSize:20, fontWeight:800, color:ac, marginTop:8, fontFamily:"'DM Mono',monospace", letterSpacing:"-0.02em" }}>{formatCTC(c[metric])}</div>
            </div>
          );
        })}
      </div>

      {/* Full list */}
      <div style={{ background:t.surf, border:`1px solid ${t.border}`, borderRadius:14, padding:"20px 22px" }}>
        <div style={{ fontSize:16, fontWeight:800, color:t.text, marginBottom:14 }}>All Companies</div>
        {stats.map((c,i) => {
          const ac  = accent(c.industry);
          const pct = Math.round((c[metric]/maxVal)*100);
          return (
            <div key={c.company} style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 0", borderBottom: i<stats.length-1?`1px solid ${t.border}`:"none" }}>
              <div style={{ width:28, textAlign:"center", fontWeight:700, fontSize:13, color:i<3?t.orange:t.text3, fontFamily:"'DM Mono',monospace" }}>{i<3?medals[i]:`#${i+1}`}</div>
              <div style={{ width:36, height:36, borderRadius:8, background:`${ac}18`, border:`1px solid ${ac}33`, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800, fontSize:14, color:ac, fontFamily:"'DM Sans',sans-serif", flexShrink:0 }}>{c.company[0]}</div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:5 }}>
                  <span style={{ fontWeight:700, fontSize:14, color:t.text }}>{c.company}</span>
                  <span style={{ fontWeight:800, fontSize:14, color:ac, fontFamily:"'DM Mono',monospace" }}>{formatCTC(c[metric])}</span>
                </div>
                <div style={{ height:4, background:t.surf2, borderRadius:10, overflow:"hidden" }}>
                  <div style={{ width:`${pct}%`, height:"100%", background:`linear-gradient(90deg,${ac}88,${ac})`, borderRadius:10, transition:"width 0.4s ease" }} />
                </div>
                <div style={{ marginTop:5, display:"flex", gap:12 }}>
                  <span style={{ fontSize:10, color:t.text3 }}>Median: {formatCTC(c.median)}</span>
                  <span style={{ fontSize:10, color:t.text3 }}>Max: {formatCTC(c.maxCTC)}</span>
                  <span style={{ fontSize:10, color:t.text3 }}>{c.count} entries · {c.roles} role{c.roles!==1?"s":""}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────
   DESKTOP SIDE PANELS (Feed dashboard: charts | feed | leaderboard)
────────────────────────────────────────────────────────────── */
const LB_METRICS = [
  { key: "avg", l: "Avg" },
  { key: "median", l: "Med" },
  { key: "maxCTC", l: "Max" },
  { key: "avgBase", l: "Base" },
];

function LeaderboardSidePanel({ entries }) {
  const t = useT();
  const [metric, setMetric] = useState("avg");
  const stats = useMemo(() => {
    const map = {};
    entries.forEach((e) => {
      if (!map[e.company]) map[e.company] = { company: e.company, industry: e.industry, totals: [], bases: [] };
      map[e.company].totals.push(totalCTC(e));
      map[e.company].bases.push(e.base || 0);
    });
    return Object.values(map)
      .map((c) => ({
        company: c.company,
        industry: c.industry,
        avg: Math.round(c.totals.reduce((a, b) => a + b, 0) / c.totals.length),
        median: Math.round(median(c.totals)),
        maxCTC: Math.max(...c.totals),
        avgBase: Math.round(c.bases.reduce((a, b) => a + b, 0) / c.bases.length),
      }))
      .sort((a, b) => b[metric] - a[metric]);
  }, [entries, metric]);
  const maxVal = stats[0]?.[metric] || 1;

  return (
    <div
      style={{
        background: t.surf,
        border: `1px solid ${t.border}`,
        borderRadius: 12,
        padding: 12,
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <div style={{ fontSize: 10, fontWeight: 800, color: t.orange, letterSpacing: "0.12em", textTransform: "uppercase" }}>
        Leaderboard
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
        {LB_METRICS.map((m) => (
          <button
            key={m.key}
            type="button"
            onClick={() => setMetric(m.key)}
            style={{
              padding: "4px 8px",
              fontSize: 10,
              fontWeight: 700,
              borderRadius: 14,
              border: `1px solid ${metric === m.key ? t.orange : t.border}`,
              background: metric === m.key ? `${t.orange}22` : t.surf2,
              color: metric === m.key ? t.text : t.text2,
              cursor: "pointer",
              fontFamily: "'DM Sans',sans-serif",
            }}
          >
            {m.l}
          </button>
        ))}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: "min(62vh, 580px)", overflowY: "auto", paddingRight: 4 }}>
        {stats.slice(0, 20).map((c, i) => {
          const ac = accent(c.industry);
          const pct = Math.round((c[metric] / maxVal) * 100);
          return (
            <div key={c.company}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 6, marginBottom: 3 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: t.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  <span style={{ color: t.text3, fontFamily: "'DM Mono',monospace", marginRight: 4 }}>{i + 1}</span>
                  {c.company}
                </span>
                <span style={{ fontSize: 11, fontWeight: 800, color: ac, fontFamily: "'DM Mono',monospace", flexShrink: 0 }}>
                  {formatCTC(c[metric])}
                </span>
              </div>
              <div style={{ height: 3, background: t.surf2, borderRadius: 6, overflow: "hidden" }}>
                <div style={{ width: `${pct}%`, height: "100%", background: `linear-gradient(90deg,${ac}88,${ac})`, borderRadius: 6 }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ChartsSidePanel({ entries }) {
  const t = useT();
  const hBar = 148;
  const hPie = 148;
  const hCity = 132;
  const axis = { fontSize: 9, fill: t.text3, fontFamily: "'DM Sans',sans-serif" };

  const byIndustry = useMemo(() => {
    const map = {};
    entries.forEach((e) => {
      if (!map[e.industry]) map[e.industry] = [];
      map[e.industry].push(totalCTC(e));
    });
    return Object.entries(map)
      .map(([name, vals]) => ({ name, avg: Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) }))
      .sort((a, b) => b.avg - a.avg)
      .slice(0, 8);
  }, [entries]);

  const byCity = useMemo(() => {
    const map = {};
    entries.forEach((e) => {
      if (!map[e.location]) map[e.location] = [];
      map[e.location].push(totalCTC(e));
    });
    return Object.entries(map)
      .map(([name, vals]) => ({ name, avg: Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) }))
      .sort((a, b) => b.avg - a.avg)
      .slice(0, 5);
  }, [entries]);

  const pie = useMemo(() => {
    const map = {};
    entries.forEach((e) => {
      map[e.industry] = (map[e.industry] || 0) + 1;
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .slice(0, 8);
  }, [entries]);

  const CTipS = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{ background: t.surf, border: `1px solid ${t.border}`, borderRadius: 8, padding: "8px 10px", fontFamily: "'DM Sans',sans-serif", fontSize: 11 }}>
        <div style={{ fontWeight: 700, color: t.text, marginBottom: 2 }}>{label}</div>
        {payload.map((p) => (
          <div key={p.name} style={{ color: p.color }}>
            ₹{formatL(p.value)} {p.name}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ fontSize: 10, fontWeight: 800, color: t.orange, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 2 }}>
        Charts snapshot
      </div>
      <div style={{ background: t.surf2, border: `1px solid ${t.border}`, borderRadius: 12, padding: "10px 8px" }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: t.text2, marginBottom: 6 }}>Avg CTC · industry</div>
        <div style={{ width: "100%", height: hBar, minHeight: hBar }}>
          <ResponsiveContainer width="100%" height={hBar}>
            <BarChart data={byIndustry} margin={{ left: 0, right: 4, top: 4, bottom: 0 }}>
              <XAxis dataKey="name" tick={axis} axisLine={false} tickLine={false} interval={0} angle={-28} textAnchor="end" height={52} />
              <YAxis tickFormatter={formatL} tick={axis} axisLine={false} tickLine={false} width={28} />
              <Tooltip content={<CTipS />} cursor={{ fill: `${t.orange}10` }} />
              <Bar dataKey="avg" radius={[4, 4, 0, 0]}>
                {byIndustry.map((e, i) => (
                  <Cell key={i} fill={accent(e.name)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div style={{ background: t.surf2, border: `1px solid ${t.border}`, borderRadius: 12, padding: "10px 8px" }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: t.text2, marginBottom: 6 }}>Entries · industry</div>
        <div style={{ width: "100%", height: hPie, minHeight: hPie }}>
          <ResponsiveContainer width="100%" height={hPie}>
            <PieChart>
              <Pie data={pie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={52} innerRadius={24}>
                {pie.map((_, i) => (
                  <Cell key={i} fill={accent(pie[i].name)} />
                ))}
              </Pie>
              <Tooltip formatter={(v, n) => [`${v} entries`, n]} contentStyle={{ background: t.surf, border: `1px solid ${t.border}`, borderRadius: 8, fontSize: 10 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div style={{ background: t.surf2, border: `1px solid ${t.border}`, borderRadius: 12, padding: "10px 8px" }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: t.text2, marginBottom: 6 }}>Avg CTC · city (top 5)</div>
        <div style={{ width: "100%", height: hCity, minHeight: hCity }}>
          <ResponsiveContainer width="100%" height={hCity}>
            <BarChart data={byCity} layout="vertical" margin={{ left: 4, right: 8, top: 4, bottom: 4 }} barCategoryGap={12}>
              <XAxis type="number" tickFormatter={formatL} tick={axis} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={{ ...axis, fill: t.text2 }} axisLine={false} tickLine={false} width={68} />
              <Tooltip content={<CTipS />} cursor={{ fill: `${t.orange}10` }} />
              <Bar dataKey="avg" name="Avg CTC" radius={[0, 4, 4, 0]}>
                {byCity.map((row, i) => (
                  <Cell key={i} fill={t.orange} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <p style={{ fontSize: 10, color: t.text3, margin: 0, lineHeight: 1.4 }}>
        Open the <strong style={{ color: t.text2 }}>Charts</strong> tab for the full analytics page — this panel is a compact snapshot.
      </p>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────
   KNOW YOUR WORTH (Feed: mobile above search; desktop: right column)
────────────────────────────────────────────────────────────── */
function KnowYourWorthSection({ entries, sidebarMode = false }) {
  const t = useT();
  const narrow = useMediaQuery("(max-width: 640px)");
  const chartH = sidebarMode ? 236 : narrow ? 300 : 340;

  const [companySelect, setCompanySelect] = useState(KYW_FEATURED);
  const [companySearch, setCompanySearch] = useState("");
  const [compareBy, setCompareBy] = useState("experience");
  const [yoeBucket, setYoeBucket] = useState("any");
  const [levelSelect, setLevelSelect] = useState("any");
  const [levelCustom, setLevelCustom] = useState("");

  const companiesCanon = useMemo(
    () => [...new Set(entries.map((e) => e.company))].sort((a, b) => a.localeCompare(b)),
    [entries],
  );

  const topFeatured = useMemo(() => {
    const map = {};
    entries.forEach((e) => {
      if (!map[e.company]) map[e.company] = [];
      map[e.company].push(totalCTC(e));
    });
    return Object.entries(map)
      .map(([name, totals]) => {
        const avg = Math.round(totals.reduce((a, b) => a + b, 0) / totals.length);
        const short = name.length > 26 ? `${name.slice(0, 24)}…` : name;
        return { name: short, fullName: name, avg, n: totals.length };
      })
      .sort((a, b) => b.avg - a.avg)
      .slice(0, 10);
  }, [entries]);

  const activeCompany = companySelect !== KYW_FEATURED ? companySelect : null;

  const levelsForCompany = useMemo(() => {
    if (!activeCompany) return [];
    const s = new Set();
    entries
      .filter((e) => e.company === activeCompany)
      .forEach((e) => {
        if (e.level && String(e.level).trim()) s.add(String(e.level).trim());
      });
    return [...s].sort((a, b) => a.localeCompare(b));
  }, [entries, activeCompany]);

  const drilldownRows = useMemo(() => {
    if (!activeCompany) return [];
    let rows = entries.filter((e) => e.company === activeCompany);
    if (compareBy === "experience") {
      rows = rows.filter((e) => yoeInBucket(e.yoe, yoeBucket));
    } else {
      if (levelSelect === LEVEL_CUSTOM_KYW) {
        const q = levelCustom.trim();
        if (q) rows = rows.filter((e) => foldCase(e.level || "").includes(foldCase(q)));
      } else if (levelSelect && levelSelect !== "any") {
        rows = rows.filter((e) => foldCase(e.level || "") === foldCase(levelSelect));
      }
    }
    return rows
      .sort((a, b) => totalCTC(b) - totalCTC(a))
      .slice(0, 25)
      .map((e, i) => ({ name: `#${i + 1}`, value: totalCTC(e) }));
  }, [entries, activeCompany, compareBy, yoeBucket, levelSelect, levelCustom]);

  const axisKY = { fontSize: sidebarMode || narrow ? 9 : 10, fill: t.text3, fontFamily: "'DM Sans',sans-serif" };

  function applyCompanySearch() {
    const resolved = resolveCompanyQuery(entries, companySearch);
    if (resolved) setCompanySelect(resolved);
  }

  const subtitleFeatured = "Average total CTC · top companies in the dataset.";
  const bucketLabel = KYW_YOE_OPTS.find((o) => o.key === yoeBucket)?.label ?? "";
  let subtitleDrill = "";
  if (activeCompany) {
    const parts = [activeCompany];
    if (compareBy === "experience") parts.push(bucketLabel);
    else if (levelSelect === LEVEL_CUSTOM_KYW) parts.push(levelCustom.trim() ? `Level contains “${levelCustom.trim()}”` : "Any level");
    else if (levelSelect !== "any") parts.push(`Level ${levelSelect}`);
    else parts.push("All levels");
    const n = drilldownRows.length;
    parts.push(`${n} salary snapshot${n !== 1 ? "s" : ""}`);
    subtitleDrill = parts.join(" · ");
  }

  const pill = (active, onClick, label) => (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "7px 14px",
        border: `1.5px solid ${active ? t.orange : t.border}`,
        borderRadius: 20,
        background: active ? `${t.orange}18` : t.surf2,
        color: active ? t.text : t.text2,
        fontSize: 12,
        fontWeight: active ? 700 : 500,
        cursor: "pointer",
        fontFamily: "'DM Sans',sans-serif",
        transition: "all 0.15s",
      }}
    >
      {label}
    </button>
  );

  return (
    <section
      id="know-your-worth"
      style={{
        background: t.surf,
        borderBottom: `1px solid ${t.border}`,
        borderRadius: 14,
        padding: sidebarMode ? "16px 12px 18px" : narrow ? "20px 12px 24px" : "28px 24px 32px",
        marginBottom: sidebarMode ? 0 : 20,
        scrollMarginTop: 112,
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      <div style={{ maxWidth: sidebarMode ? "100%" : 1200, margin: "0 auto" }}>
        <div style={{ marginBottom: 16 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 800,
              color: t.orange,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              marginBottom: 6,
            }}
          >
            Know your worth
          </div>
          <h2
            style={{
              fontSize: sidebarMode ? 17 : narrow ? 20 : 24,
              fontWeight: 800,
              color: t.text,
              margin: 0,
              letterSpacing: "-0.02em",
            }}
          >
            See how pay stacks up
          </h2>
          <p style={{ fontSize: 13, color: t.text2, margin: "8px 0 0", lineHeight: 1.5 }}>
            {activeCompany ? subtitleDrill : subtitleFeatured}
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: narrow || sidebarMode ? "1fr" : "1fr 1fr",
            gap: 12,
            marginBottom: 16,
            alignItems: "end",
          }}
        >
          <Select
            label="Company"
            value={companySelect}
            onChange={(e) => {
              const v = e.target.value;
              setCompanySelect(v);
              if (v === KYW_FEATURED) setCompanySearch("");
              else setCompanySearch(v);
            }}
          >
            <option value={KYW_FEATURED}>Featured — top companies (avg CTC)</option>
            {companiesCanon.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
          <div>
            <FieldLabel text="Find company (case-insensitive)" />
            <div style={{ display: "flex", gap: 8 }}>
              <input
                value={companySearch}
                onChange={(e) => setCompanySearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && applyCompanySearch()}
                placeholder="Type e.g. google, zepto…"
                style={{
                  flex: 1,
                  minWidth: 0,
                  boxSizing: "border-box",
                  background: t.surf2,
                  border: `1.5px solid ${t.border}`,
                  borderRadius: 10,
                  padding: "11px 14px",
                  fontSize: 13,
                  color: t.text,
                  outline: "none",
                  fontFamily: "'DM Sans',sans-serif",
                }}
              />
              <button
                type="button"
                onClick={applyCompanySearch}
                style={{
                  flexShrink: 0,
                  background: t.orange,
                  color: "#0E0E0E",
                  border: "none",
                  borderRadius: 10,
                  padding: "0 16px",
                  fontSize: 13,
                  fontWeight: 800,
                  cursor: "pointer",
                  fontFamily: "'DM Sans',sans-serif",
                }}
              >
                Find
              </button>
            </div>
          </div>
        </div>

        {activeCompany && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: t.text2, marginBottom: 8, letterSpacing: "0.06em" }}>
              Compare within company by
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
              {pill(compareBy === "experience", () => {
                setCompareBy("experience");
                setLevelSelect("any");
                setLevelCustom("");
              }, "Years of experience")}
              {pill(compareBy === "level", () => {
                setCompareBy("level");
                setYoeBucket("any");
              }, "Level / band")}
            </div>
            {compareBy === "experience" && (
              <Select
                label="Experience band"
                value={yoeBucket}
                onChange={(e) => setYoeBucket(e.target.value)}
              >
                {KYW_YOE_OPTS.map((o) => (
                  <option key={o.key} value={o.key}>
                    {o.label}
                  </option>
                ))}
              </Select>
            )}
            {compareBy === "level" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <Select
                  label="Level / band"
                  value={levelSelect}
                  onChange={(e) => {
                    const v = e.target.value;
                    setLevelSelect(v);
                    if (v !== LEVEL_CUSTOM_KYW) setLevelCustom("");
                  }}
                >
                  <option value="any">All levels</option>
                  {levelsForCompany.map((lv) => (
                    <option key={lv} value={lv}>
                      {lv}
                    </option>
                  ))}
                  <option value={LEVEL_CUSTOM_KYW}>Custom (type below)…</option>
                </Select>
                {levelSelect === LEVEL_CUSTOM_KYW && (
                  <Input
                    label="Custom level (contains, case-insensitive)"
                    placeholder="e.g. senior, L5, principal…"
                    value={levelCustom}
                    onChange={(e) => {
                      setLevelCustom(e.target.value);
                      setLevelSelect(LEVEL_CUSTOM_KYW);
                    }}
                  />
                )}
              </div>
            )}
          </div>
        )}

        <div
          style={{
            background: t.surf2,
            border: `1px solid ${t.border}`,
            borderRadius: 14,
            padding: sidebarMode ? "12px 10px" : narrow ? "14px 10px" : "18px 16px",
            width: "100%",
            minWidth: 0,
            boxSizing: "border-box",
          }}
        >
          {!activeCompany && topFeatured.length > 0 && (
            <div style={{ width: "100%", height: chartH, minHeight: chartH }}>
              <ResponsiveContainer width="100%" height={chartH}>
              <BarChart layout="vertical" data={topFeatured} margin={{ left: 4, right: 12, top: 8, bottom: 8 }}>
                <XAxis type="number" tickFormatter={formatL} tick={axisKY} axisLine={false} tickLine={false} />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ ...axisKY, fill: t.text2 }}
                  axisLine={false}
                  tickLine={false}
                  width={sidebarMode ? 84 : narrow ? 108 : 148}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const row = payload[0]?.payload;
                    return (
                      <div
                        style={{
                          background: t.surf,
                          border: `1px solid ${t.border}`,
                          borderRadius: 8,
                          padding: "10px 12px",
                          fontSize: 12,
                          fontFamily: "'DM Sans',sans-serif",
                        }}
                      >
                        <div style={{ fontWeight: 700, color: t.text, marginBottom: 4 }}>{row.fullName}</div>
                        <div style={{ color: t.orange, fontFamily: "'DM Mono',monospace" }}>{formatCTC(row.avg)} avg</div>
                        <div style={{ fontSize: 11, color: t.text3 }}>{row.n} entries</div>
                      </div>
                    );
                  }}
                />
                <Bar dataKey="avg" name="Avg CTC" fill={t.orange} radius={[0, 6, 6, 0]} barSize={sidebarMode ? 16 : narrow ? 18 : 22} />
              </BarChart>
            </ResponsiveContainer>
            </div>
          )}

          {activeCompany && drilldownRows.length > 0 && (
            <div style={{ width: "100%", height: Math.min(sidebarMode ? 300 : 420, 120 + drilldownRows.length * (sidebarMode ? 22 : narrow ? 26 : 28)), minHeight: 140 }}>
              <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={drilldownRows} margin={{ left: 4, right: 12, top: 8, bottom: 8 }}>
                <XAxis type="number" tickFormatter={formatL} tick={axisKY} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={axisKY} axisLine={false} tickLine={false} width={36} />
                <Tooltip
                  formatter={(v) => formatCTC(v)}
                  contentStyle={{
                    background: t.surf,
                    border: `1px solid ${t.border}`,
                    borderRadius: 8,
                    fontFamily: "'DM Sans',sans-serif",
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="value" name="Total CTC" fill={accent(entries.find((e) => e.company === activeCompany)?.industry || "")} radius={[0, 6, 6, 0]} barSize={sidebarMode ? 14 : narrow ? 16 : 20} />
              </BarChart>
            </ResponsiveContainer>
            </div>
          )}

          {activeCompany && drilldownRows.length === 0 && (
            <div style={{ textAlign: "center", padding: "36px 16px", color: t.text3, fontSize: 14 }}>
              No salaries match this company and filter yet. Try another band, level, or pick a different company.
            </div>
          )}

          {!activeCompany && topFeatured.length === 0 && (
            <div style={{ textAlign: "center", padding: "36px 16px", color: t.text3, fontSize: 14 }}>
              Add entries to see company averages here.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

/* ──────────────────────────────────────────────────────────────
   ROOT APP
────────────────────────────────────────────────────────────── */
export default function App() {
  const [dark,      setDark]      = useState(true);
  const [entries,   setEntries]   = useState(SEED);
  const [tab,       setTab]       = useState("Feed");
  const [showForm,  setShowForm]  = useState(false);
  const narrow = useMediaQuery("(max-width: 640px)");
  /** Tablet/desktop: Feed tab uses 3-column dashboard; Charts / Leaderboard tabs show full pages. */
  const wideDashboard = useMediaQuery("(min-width: 768px)");

  const t = tokens(dark);

  useEffect(() => {
    const bg = tokens(dark).bg;
    document.documentElement.style.backgroundColor = bg;
    document.body.style.backgroundColor = bg;
  }, [dark]);

  useEffect(() => {
    if (!supabase) return undefined;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("salary_entries")
        .select("*")
        .order("submitted_date", { ascending: false });
      if (cancelled) return;
      if (error) {
        console.error("Supabase: failed to load salary_entries", error.message);
        return;
      }
      if (data?.length) setEntries(data.map(rowToEntry));
    })();
    return () => { cancelled = true; };
  }, []);

  const avgCTC  = formatCTC(Math.round(entries.reduce((s, e) => s + totalCTC(e), 0) / (entries.length || 1)));
  const avgBase = formatCTC(Math.round(entries.reduce((s, e) => s + (e.base||0), 0) / (entries.length || 1)));
  const cos     = [...new Set(entries.map(e => e.company))].length;

  function handleNewEntry(data) {
    if (!supabase) {
      setEntries(prev => [{ id: `local-${Date.now()}`, ...data }, ...prev]);
      return;
    }
    const row = submittedDataToRow(data);
    (async () => {
      const { data: inserted, error } = await supabase
        .from("salary_entries")
        .insert(row)
        .select()
        .single();
      if (error) {
        console.error("Supabase: insert failed", error.message);
        setEntries(prev => [{ id: `local-${Date.now()}`, ...data }, ...prev]);
        return;
      }
      setEntries(prev => [rowToEntry(inserted), ...prev]);
    })();
  }

  const tabIcons = { Feed:"📋", Charts:"📊", Leaderboard:"🏆" };

  const hx = narrow ? 12 : 24;
  const shellPad = narrow ? 12 : 24;

  return (
    <ThemeCtx.Provider value={{ dark, toggle: () => setDark(d => !d) }}>
      <div style={{ minHeight:"100vh", width:"100%", boxSizing:"border-box", background:t.bg, fontFamily:"'DM Sans',sans-serif", color:t.text, transition:"background 0.25s, color 0.25s" }}>

        {/* ── Header ── */}
        <header style={{
          background:t.surf, borderBottom:`1px solid ${t.border}`,
          padding: narrow ? "10px 12px" : "0 24px",
          display:"flex", alignItems:"center", justifyContent:"space-between",
          gap:10,
          height:56, position:"sticky", top:0, zIndex:100,
          boxShadow:`0 1px 12px rgba(0,0,0,${dark?0.4:0.06})`, transition:"background 0.25s, border-color 0.25s",
        }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, flexShrink:0, minWidth:0 }}>
            <Logo size={narrow ? 18 : 20} />
            <Beta />
            {narrow && (
              <span style={{ fontSize:10, color:t.text2, whiteSpace:"nowrap", opacity:0.9 }}>
                {entries.length} shared
              </span>
            )}
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:narrow ? 6 : 10, flexShrink:0 }}>
            <a
              href={feedbackHref()}
              {...(feedbackOpensInNewTab() ? { target: "_blank", rel: "noopener noreferrer" } : {})}
              aria-label={
                feedbackOpensInNewTab()
                  ? "Send feedback (opens Google Form in a new tab)"
                  : "Send feedback (opens your email app)"
              }
              style={{
                background:"transparent",
                border:`1px solid ${t.border}`,
                borderRadius:20,
                padding: narrow ? "6px 10px" : "6px 14px",
                fontSize:narrow ? 12 : 13,
                fontWeight:600,
                color:t.text2,
                fontFamily:"'DM Sans',sans-serif",
                textDecoration:"none",
                whiteSpace:"nowrap",
                display:"flex",
                alignItems:"center",
                gap:5,
              }}
            >
              💬 {narrow ? "Feedback" : "Send feedback"}
            </a>
            {!narrow && (
              <div style={{ fontSize:11, color:t.text2, display:"flex", alignItems:"center", gap:5 }}>
                <span style={{ width:7, height:7, borderRadius:"50%", background:t.green, display:"inline-block", boxShadow:`0 0 6px ${t.green}` }} />
                {entries.length} salaries shared
              </div>
            )}
            <button type="button" onClick={() => setDark(d => !d)} style={{ background:t.surf2, border:`1px solid ${t.border}`, borderRadius:20, padding: narrow ? "6px 10px" : "6px 12px", cursor:"pointer", fontSize:narrow ? 12 : 13, color:t.text2, fontFamily:"'DM Sans',sans-serif", display:"flex", alignItems:"center", gap:5 }}>
              {dark ? "☀️" : "🌙"} {!narrow && (dark ? "Light" : "Dark")}
            </button>
            <button type="button" onClick={() => setShowForm(true)} style={{ background:t.orange, color:"#0E0E0E", border:"none", borderRadius:10, padding: narrow ? "8px 12px" : "9px 18px", fontSize:narrow ? 12 : 13, fontWeight:800, cursor:"pointer", fontFamily:"'DM Sans',sans-serif", boxShadow:`0 0 16px ${t.orange}44`, whiteSpace:"nowrap" }}>
              {narrow ? "+ Share" : "+ Share Salary"}
            </button>
          </div>
        </header>

        {/* ── Hero ── */}
        <div style={{ background: dark ? "#111111" : "#FFF8F3", borderBottom:`1px solid ${t.border}`, padding: narrow ? "24px 12px 20px" : "32px 24px 26px", transition:"background 0.25s" }}>
          <div style={{ width:"100%", maxWidth:"100%", margin:"0 auto", textAlign:"center", padding:`0 ${hx}px`, boxSizing:"border-box" }}>
            <div style={{ fontSize:11, fontWeight:700, color:t.orange, letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:10 }}>🇮🇳 India's Anonymous Salary Community</div>
            <h1 style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"clamp(24px,4vw,40px)", fontWeight:800, color:t.text, margin:0, letterSpacing:"-0.03em", lineHeight:1.2 }}>
              Real salaries. No BS.{" "}
              <span style={{ color:t.orange }}>Know your worth.</span>
            </h1>
            <p style={{ color:t.text2, fontSize:14, marginTop:12, maxWidth:460, margin:"12px auto 0", lineHeight:1.6 }}>
              Community-powered salary data from India's best companies. Anonymous, honest, and free.
            </p>
            <div style={{ display:"flex", justifyContent:"center", gap: narrow ? 20 : 40, marginTop:24, flexWrap:"wrap" }}>
              {[
                { label:"Total Entries", val:entries.length, ac:t.orange },
                { label:"Avg Total CTC", val:avgCTC,         ac:"#FF6B35" },
                { label:"Avg Base",      val:avgBase,         ac:t.purple },
                { label:"Companies",     val:cos,             ac:t.green  },
              ].map(s => (
                <div key={s.label} style={{ textAlign:"center", minWidth: narrow ? "72px" : undefined }}>
                  <div style={{ fontSize: narrow ? 20 : 24, fontWeight:800, color:s.ac, fontFamily:"'DM Mono',monospace", letterSpacing:"-0.02em" }}>{s.val}</div>
                  <div style={{ fontSize:10, color:t.text2, fontWeight:600, marginTop:3, textTransform:"uppercase", letterSpacing:"0.08em" }}>{s.label}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop:18 }}>
              <button
                type="button"
                onClick={() => {
                  setTab("Feed");
                  setTimeout(() => document.getElementById("know-your-worth")?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
                }}
                style={{
                  background:"transparent", border:`1.5px solid ${t.orange}55`, color:t.orange,
                  borderRadius:20, padding:"8px 18px", fontSize:12, fontWeight:700, cursor:"pointer",
                  fontFamily:"'DM Sans',sans-serif",
                }}
              >
                Pay benchmarks · company compare ↓
              </button>
            </div>
          </div>
        </div>

        {/* ── Tabs — Feed / Charts / Leaderboard (all breakpoints; desktop Charts & Leaderboard are full detail) ── */}
        <div style={{ background:t.surf, borderBottom:`1px solid ${t.border}`, display:"flex", padding: narrow ? "0 8px" : "0 24px", position:"sticky", top:56, zIndex:90, transition:"background 0.25s", overflowX:"auto", WebkitOverflowScrolling:"touch" }}>
          {TABS.map(tab_ => (
            <button key={tab_} type="button" onClick={() => setTab(tab_)} style={{ background:"none", border:"none", padding: narrow ? "12px 10px" : "14px 18px", fontSize: narrow ? 12 : 13, fontWeight: tab===tab_ ? 700 : 500, cursor:"pointer", color: tab===tab_ ? t.orange : t.text2, fontFamily:"'DM Sans',sans-serif", borderBottom:`2.5px solid ${tab===tab_ ? t.orange : "transparent"}`, marginBottom:-1, transition:"all 0.15s", flexShrink:0 }}>
              {tabIcons[tab_]} {tab_}
            </button>
          ))}
        </div>

        {/* ── Content — desktop Feed: 3-col dashboard; desktop Charts/Leaderboard: full pages; mobile: tabbed full-width ── */}
        <main style={{ width:"100%", maxWidth:"100%", margin:0, padding:`${shellPad}px`, boxSizing:"border-box" }}>
          {!wideDashboard ? (
            <>
              {tab === "Feed"        && <FeedTab entries={entries} />}
              {tab === "Charts"      && <ChartsTab entries={entries} />}
              {tab === "Leaderboard" && <LeaderboardTab entries={entries} />}
            </>
          ) : tab === "Feed" ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(220px, 0.95fr) minmax(0, 2.2fr) minmax(300px, 1.12fr)",
                gap: 18,
                width: "100%",
                alignItems: "start",
                maxWidth: 1780,
                margin: "0 auto",
              }}
            >
              <aside
                style={{
                  position: "sticky",
                  top: 108,
                  maxHeight: "calc(100vh - 108px)",
                  overflowY: "auto",
                  minWidth: 0,
                }}
              >
                <ChartsSidePanel entries={entries} />
              </aside>
              <div style={{ minWidth: 0 }}>
                <FeedTab entries={entries} omitKnowYourWorth />
              </div>
              <aside
                style={{
                  position: "sticky",
                  top: 108,
                  maxHeight: "calc(100vh - 108px)",
                  overflowY: "auto",
                  minWidth: 0,
                }}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <KnowYourWorthSection entries={entries} sidebarMode />
                  <LeaderboardSidePanel entries={entries} />
                </div>
              </aside>
            </div>
          ) : tab === "Charts" ? (
            <div style={{ width: "100%", maxWidth: 1320, margin: "0 auto" }}>
              <ChartsTab entries={entries} />
            </div>
          ) : (
            <div style={{ width: "100%", maxWidth: 1320, margin: "0 auto" }}>
              <LeaderboardTab entries={entries} />
            </div>
          )}
        </main>

        {showForm && (
          <SubmitForm
            onSubmit={handleNewEntry}
            onClose={() => setShowForm(false)}
          />
        )}

        <footer style={{ borderTop:`1px solid ${t.border}`, padding: narrow ? "18px 12px" : "24px 16px", textAlign:"center", color:t.text3, fontSize:narrow ? 11 : 12 }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:10, flexWrap:"wrap" }}>
            <Logo size={15} />
            <span>· Made for India's working professionals · All submissions are 100% anonymous</span>
            <Beta />
          </div>
        </footer>
      </div>
    </ThemeCtx.Provider>
  );
}
