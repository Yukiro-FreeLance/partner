import type { ExpenseCategory } from "@/lib/domain";

export const SAMPLE_PLAN_TITLE = "MCR Concert Trip — Manila";

export function isSamplePlanTitle(title: string) {
  const normalize = (value: string) => value.normalize("NFKC").toLowerCase().replace(/[\u2010-\u2015\u2212-]/g, "-").replace(/\s+/g, " ").trim();
  return normalize(title) === normalize(SAMPLE_PLAN_TITLE);
}

export type SampleActivity = {
  title: string;
  description: string;
  location?: string;
  mapUrl?: string;
  start: string;
  end: string;
  notes?: string;
  reservation?: string;
  checklist?: string[];
};

export type SampleExpense = {
  name: string;
  category: ExpenseCategory;
  estimated: number;
};

export type SampleDay = {
  date: string;
  title: string;
  description: string;
  activities: SampleActivity[];
  expenses: SampleExpense[];
};

const manila = "https://maps.google.com/?q=Manila+Philippines";
const airport = "https://maps.google.com/?q=Ninoy+Aquino+International+Airport";

export const samplePlan = {
  title: SAMPLE_PLAN_TITLE,
  description: "A shared trip to Manila for the My Chemical Romance concert, with daily plans and a sample budget. Confirm tickets, the venue, entry rules, and travel times against the official event details before you go.",
  destination: "Manila, Philippines",
  startDate: "2026-11-13",
  endDate: "2026-11-18",
  eventType: "concert" as const,
  estimatedBudget: 25000,
  currency: "PHP",
  status: "planning" as const,
};

export const sampleDays: SampleDay[] = [
  {
    date: "2026-11-13",
    title: "Preparation and flight to Manila",
    description: "Travel and preparation day.",
    activities: [
      { title: "Confirm flight tickets and accommodation", description: "Check both reservations, passenger names, and the hotel confirmation.", start: "07:00", end: "08:00", reservation: "Add the booking reference when you have it." },
      { title: "Check concert tickets, identification, and documents", description: "Pack identification, the wallet, concert tickets, and any travel documents you both need.", start: "08:00", end: "09:00", checklist: ["Flight tickets", "Accommodation reservation", "Concert tickets", "Identification", "Wallet"] },
      { title: "Prepare outfits and essentials", description: "Set aside concert outfits, merchandise essentials, chargers, power banks, and toiletries.", start: "09:00", end: "10:30" },
      { title: "Check baggage and airport transportation", description: "Confirm the baggage allowance and how you will get to the airport.", start: "10:30", end: "11:00" },
      { title: "Coordinate departure with your partner", description: "Agree on the meeting point and the time you need to leave.", start: "11:00", end: "11:30" },
      { title: "Travel to the airport", description: "Leave with enough time for traffic and check-in.", location: "Departure airport", start: "12:00", end: "13:30" },
      { title: "Check in and drop baggage", description: "Complete check-in and baggage drop-off together.", location: "Departure airport", start: "13:30", end: "14:30" },
      { title: "Snacks, photos, and flight updates", description: "Buy snacks or drinks if you want them, take travel photos, and check the flight status.", location: "Airport", start: "14:30", end: "15:30" },
      { title: "Board the flight to Manila", description: "Board together and keep tickets and identification easy to reach.", location: "Flight to Manila", start: "16:00", end: "20:00", notes: "Replace these times with your real flight." },
      { title: "Travel from the airport to the hotel", description: "Use your planned Manila transportation and confirm the terminal if you are arriving at NAIA.", location: "Manila airport", mapUrl: airport, start: "21:00", end: "22:00", notes: "Confirm the actual airport and terminal." },
      { title: "Check in, unpack, and rest", description: "Check in, unpack what you need tonight, and rest before dinner.", location: "Accommodation", mapUrl: manila, start: "22:00", end: "22:30" },
      { title: "Dinner together", description: "Have dinner near the accommodation.", location: "Manila", mapUrl: manila, start: "22:30", end: "23:30" },
      { title: "Review tomorrow's concert plan", description: "Look over the meeting point, transport, and the concert schedule you still need to confirm.", location: "Accommodation", start: "23:30", end: "23:50" },
    ],
    expenses: [
      { name: "Flight tickets", category: "flight", estimated: 7750 },
      { name: "Airport transportation", category: "transportation", estimated: 400 },
      { name: "Airport meals and snacks", category: "food", estimated: 250 },
      { name: "Manila transportation", category: "transportation", estimated: 350 },
      { name: "Accommodation", category: "accommodation", estimated: 1100 },
      { name: "Dinner", category: "food", estimated: 500 },
    ],
  },
  {
    date: "2026-11-14",
    title: "MCR concert day",
    description: "Concert experience and quality time. Schedules, entry rules, and the venue are placeholders until you confirm them.",
    activities: [
      { title: "Breakfast together", description: "Wake up and have breakfast before the concert day gets busy.", location: "Accommodation", start: "08:00", end: "09:00" },
      { title: "Confirm venue, entry, and transport", description: "Check the concert venue, entry rules, gate opening time, and how you will get there.", location: "Concert venue, Manila", mapUrl: manila, start: "09:00", end: "09:40", notes: "Edit this once the official event details are confirmed." },
      { title: "Prepare concert outfits and accessories", description: "Lay out what you want to wear and pack any small accessories.", start: "09:40", end: "10:20" },
      { title: "Charge phones and power banks", description: "Charge phones and power banks before you leave.", start: "10:20", end: "10:40", checklist: ["Concert outfits", "Phones and power banks charged", "Tickets, IDs, cash, and payment methods"] },
      { title: "Couple photos before leaving", description: "Take photos together before heading out.", location: "Accommodation", start: "10:40", end: "11:10" },
      { title: "Lunch", description: "Eat lunch with enough time to reach the venue.", location: "Manila", mapUrl: manila, start: "12:00", end: "13:00" },
      { title: "Travel to the concert venue", description: "Leave early enough for traffic and the queue.", location: "Concert venue, Manila", mapUrl: manila, start: "14:00", end: "15:30" },
      { title: "Find the entrance and meeting point", description: "Locate the entrance, ticketing area, and the place you agreed to meet if you get separated.", location: "Concert venue, Manila", start: "15:30", end: "16:10" },
      { title: "Merchandise and entry queue", description: "Visit merchandise booths if you want souvenirs, then follow the organizer's entry instructions and queue schedule.", location: "Concert venue, Manila", start: "16:10", end: "18:00", notes: "Confirm booth hours and the queue schedule with the organizer." },
      { title: "My Chemical Romance concert", description: "Enter, find your seats or standing area, and enjoy the performance together. Take photos and videos only where they are permitted.", location: "Concert venue, Manila", mapUrl: manila, start: "18:00", end: "22:00", notes: "Record favorite songs and moments. Replace this time with the real show schedule.", reservation: "Add ticket or seat details" },
      { title: "Meet after the concert", description: "Meet at the predetermined point and allow extra time for crowds and transportation queues.", location: "Meeting point", start: "22:00", end: "22:40" },
      { title: "Late-night meal and ride back", description: "Have a late meal or snack, then travel back to the accommodation.", location: "Manila", mapUrl: manila, start: "22:40", end: "23:40" },
      { title: "Save the night's photos", description: "Share favorite moments and save photos to a shared album.", location: "Accommodation", start: "23:40", end: "23:59" },
    ],
    expenses: [
      { name: "Breakfast and lunch", category: "food", estimated: 600 },
      { name: "Local transportation", category: "transportation", estimated: 300 },
      { name: "Concert merchandise", category: "merchandise", estimated: 700 },
      { name: "Food and drinks", category: "food", estimated: 350 },
      { name: "Post-concert transportation", category: "transportation", estimated: 400 },
      { name: "Late-night meal", category: "food", estimated: 400 },
      { name: "Accommodation", category: "accommodation", estimated: 1100 },
    ],
  },
  {
    date: "2026-11-15",
    title: "Recovery and Manila date",
    description: "Rest and explore.",
    activities: [
      { title: "Sleep in", description: "Wake up later after the concert.", location: "Accommodation", start: "10:00", end: "11:00" },
      { title: "Brunch together", description: "Have a slow brunch.", location: "Manila", mapUrl: manila, start: "11:00", end: "12:30" },
      { title: "Mall, café, park, or attraction", description: "Visit one place you both want to see.", location: "Manila", mapUrl: manila, start: "13:00", end: "16:00" },
      { title: "Review concert photos and videos", description: "Look through what you captured and keep the ones you want to share.", start: "16:30", end: "17:15" },
      { title: "Couple activity", description: "Enjoy the activity you planned for this afternoon.", location: "Manila", mapUrl: manila, start: "17:15", end: "19:00" },
      { title: "Dinner at a restaurant", description: "Have dinner together.", location: "Manila", mapUrl: manila, start: "19:30", end: "21:00" },
      { title: "Prepare for tomorrow", description: "Return to the accommodation and set aside what you need for the next day.", location: "Accommodation", start: "21:15", end: "22:00" },
    ],
    expenses: [
      { name: "Brunch", category: "food", estimated: 450 },
      { name: "Transportation", category: "transportation", estimated: 250 },
      { name: "Attraction fees", category: "activities", estimated: 250 },
      { name: "Café", category: "food", estimated: 200 },
      { name: "Shopping", category: "shopping", estimated: 300 },
      { name: "Dinner", category: "food", estimated: 550 },
      { name: "Accommodation", category: "accommodation", estimated: 1100 },
    ],
  },
  {
    date: "2026-11-16",
    title: "Explore Manila",
    description: "Sightseeing and shared experiences.",
    activities: [
      { title: "Breakfast together", description: "Eat breakfast before heading out.", location: "Accommodation", start: "08:30", end: "09:30" },
      { title: "Morning attractions", description: "Visit the places you picked for the morning and take photos along the way.", location: "Manila", mapUrl: manila, start: "10:00", end: "12:30" },
      { title: "Lunch at a local restaurant", description: "Stop for lunch.", location: "Manila", mapUrl: manila, start: "12:45", end: "14:00" },
      { title: "Afternoon sightseeing or shopping", description: "Continue exploring or shop for something you both want.", location: "Manila", mapUrl: manila, start: "14:30", end: "17:30" },
      { title: "Dinner together", description: "Have dinner and talk through the day.", location: "Manila", mapUrl: manila, start: "18:30", end: "20:00" },
      { title: "Return to the hotel", description: "Head back and rest.", location: "Accommodation", start: "20:30", end: "21:15" },
    ],
    expenses: [
      { name: "Breakfast", category: "food", estimated: 350 },
      { name: "Transportation", category: "transportation", estimated: 300 },
      { name: "Entrance fees", category: "activities", estimated: 400 },
      { name: "Lunch", category: "food", estimated: 450 },
      { name: "Souvenirs", category: "shopping", estimated: 300 },
      { name: "Dinner", category: "food", estimated: 500 },
      { name: "Accommodation", category: "accommodation", estimated: 1100 },
    ],
  },
  {
    date: "2026-11-17",
    title: "Free day and travel preparation",
    description: "Flexible date and preparation.",
    activities: [
      { title: "Breakfast", description: "Enjoy an easy breakfast.", location: "Accommodation", start: "09:00", end: "10:00" },
      { title: "Flexible date or a last attraction", description: "Keep this open for a date or any place you still want to visit.", location: "Manila", mapUrl: manila, start: "10:30", end: "14:00" },
      { title: "Last-minute souvenirs", description: "Pick up anything you still want to bring home.", location: "Manila", mapUrl: manila, start: "14:30", end: "16:00" },
      { title: "Check the return flight", description: "Confirm the flight time, terminal, and baggage rules.", start: "16:30", end: "17:00", reservation: "Add the return booking reference" },
      { title: "Pack and check baggage limits", description: "Pack luggage and weigh bags if you need to.", location: "Accommodation", start: "17:00", end: "18:30", checklist: ["Return flight details", "Baggage limits", "Airport transportation"] },
      { title: "Confirm airport transportation", description: "Book or agree on the ride to the airport.", start: "18:30", end: "19:00" },
      { title: "Dinner", description: "Have a relaxed dinner.", location: "Manila", mapUrl: manila, start: "19:30", end: "21:00" },
    ],
    expenses: [
      { name: "Breakfast", category: "food", estimated: 300 },
      { name: "Flexible activity", category: "activities", estimated: 350 },
      { name: "Souvenirs", category: "shopping", estimated: 400 },
      { name: "Laundry", category: "other", estimated: 150 },
      { name: "Transportation", category: "transportation", estimated: 250 },
      { name: "Dinner", category: "food", estimated: 450 },
      { name: "Accommodation", category: "accommodation", estimated: 1100 },
    ],
  },
  {
    date: "2026-11-18",
    title: "Return travel",
    description: "Travel home.",
    activities: [
      { title: "Breakfast and checkout", description: "Check out of the accommodation and keep receipts you still need.", location: "Accommodation", start: "07:00", end: "08:00" },
      { title: "Verify belongings and documents", description: "Check passports or identification, tickets, wallets, and chargers.", start: "08:00", end: "08:20", checklist: ["Identification", "Return tickets", "Wallets and cards", "Chargers"] },
      { title: "Travel to the airport", description: "Leave with enough time for traffic and check-in.", location: "Manila airport", mapUrl: airport, start: "08:30", end: "10:00" },
      { title: "Check in and board", description: "Check in, drop baggage if needed, and board the return flight.", location: "Airport", start: "10:00", end: "14:00", notes: "Replace these times with your real flight." },
      { title: "Track remaining travel costs", description: "Add transportation and meal expenses before you forget them.", start: "14:00", end: "14:20" },
      { title: "Arrive home and complete the plan", description: "When you are home, mark the itinerary completed.", location: "Home", start: "18:00", end: "19:00" },
    ],
    expenses: [
      { name: "Breakfast", category: "food", estimated: 250 },
      { name: "Airport transportation", category: "transportation", estimated: 400 },
      { name: "Meals", category: "food", estimated: 250 },
      { name: "Baggage fees", category: "other", estimated: 400 },
    ],
  },
];

export function sampleEstimateTotal() {
  return sampleDays.reduce((sum, day) => sum + day.expenses.reduce((inner, expense) => inner + expense.estimated, 0), 0);
}
