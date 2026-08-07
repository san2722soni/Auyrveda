const path = require("node:path");
const { MongoClient } = require("mongodb");
const dotenv = require("dotenv");

dotenv.config({ path: path.join(__dirname, "..", ".env") });

const mongoUri = process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017";
const mongoDatabase = process.env.MONGODB_DATABASE ?? "ayurveda";

const demoPatients = [
  ["Aarav Sharma", "+919880000001", "Digestive discomfort"],
  ["Isha Patel", "+919880000002", "Stress and sleep support"],
  ["Rohan Mehta", "+919880000003", "Joint stiffness"],
  ["Neha Rao", "+919880000004", "Hair fall consultation"],
  ["Kabir Singh", "+919880000005", "Skin allergy support"],
  ["Anika Nair", "+919880000006", "Migraine and acidity"],
  ["Vihaan Desai", "+919880000007", "Weight management"],
  ["Mira Kapoor", "+919880000008", "PCOS wellness"],
  ["Aditya Jain", "+919880000009", "Back pain consultation"],
  ["Sanya Verma", "+919880000010", "Immunity and fatigue"],
];

function addDays(date, days) {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate() + days,
    date.getHours(),
    date.getMinutes(),
    date.getSeconds(),
    date.getMilliseconds()
  );
}

function atHour(date, hour, minute = 0) {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    hour,
    minute,
    0,
    0
  );
}

function toDateValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function buildConversationMessages(patient, index, now) {
  const [name, phoneNumber, reason] = patient;
  const day = atHour(addDays(now, index - 9), 10 + (index % 7), 15);

  return [
    {
      phoneNumber,
      role: "user",
      content: `Namaste, I am ${name}. I need help with ${reason.toLowerCase()}.`,
      createdAt: day,
    },
    {
      phoneNumber,
      role: "assistant",
      content:
        "Namaste. Please share your preferred date, time, and contact method for the consultation.",
      createdAt: new Date(day.getTime() + 4 * 60 * 1000),
    },
    {
      phoneNumber,
      role: "user",
      content: `I prefer ${toDateValue(addDays(now, index + 1))} around ${
        index % 2 === 0 ? "10:30 AM" : "4:00 PM"
      }.`,
      createdAt: new Date(day.getTime() + 8 * 60 * 1000),
    },
    {
      phoneNumber,
      role: "assistant",
      content:
        "Thank you. Your appointment request has been shared with the clinic team.",
      createdAt: new Date(day.getTime() + 12 * 60 * 1000),
    },
  ];
}

async function main() {
  const client = new MongoClient(mongoUri);
  const now = new Date();
  const phoneNumbers = demoPatients.map((patient) => patient[1]);

  await client.connect();

  try {
    const db = client.db(mongoDatabase);
    const users = db.collection("users");
    const messages = db.collection("messages");
    const appointments = db.collection("appointments");

    await messages.deleteMany({ phoneNumber: { $in: phoneNumbers } });
    await appointments.deleteMany({ phoneNumber: { $in: phoneNumbers } });

    await Promise.all(
      demoPatients.map(([name, phoneNumber], index) => {
        const firstSeenAt = atHour(addDays(now, index - 9), 9 + (index % 8), 0);
        const lastActiveAt = atHour(addDays(now, index - 2), 15, index * 3);

        return users.updateOne(
          { phoneNumber },
          {
            $set: {
              phoneNumber,
              firstSeenAt,
              lastActiveAt,
              totalMessages: 4,
              updatedAt: lastActiveAt,
            },
            $setOnInsert: {
              createdAt: firstSeenAt,
            },
          },
          { upsert: true }
        );
      })
    );

    const demoMessages = demoPatients.flatMap((patient, index) =>
      buildConversationMessages(patient, index, now)
    );
    const demoAppointments = demoPatients.map(
      ([patientName, phoneNumber, reason], index) => {
        const createdAt = atHour(addDays(now, index - 9), 11 + (index % 6), 30);
        const isCompleted = index % 3 === 0;

        return {
          patientName,
          phoneNumber,
          preferredDate: toDateValue(addDays(now, index + 1)),
          preferredTime: index % 2 === 0 ? "10:30 AM" : "4:00 PM",
          reason,
          preferredContactMethod: index % 2 === 0 ? "whatsapp" : "call",
          source: "whatsapp",
          isCompleted,
          createdAt,
          updatedAt: isCompleted
            ? new Date(createdAt.getTime() + 2 * 60 * 60 * 1000)
            : createdAt,
          ...(isCompleted
            ? { completedAt: new Date(createdAt.getTime() + 2 * 60 * 60 * 1000) }
            : {}),
        };
      }
    );

    await messages.insertMany(demoMessages);
    await appointments.insertMany(demoAppointments);

    console.log(
      JSON.stringify(
        {
          database: mongoDatabase,
          users: demoPatients.length,
          conversations: demoPatients.length,
          messages: demoMessages.length,
          appointments: demoAppointments.length,
        },
        null,
        2
      )
    );
  } finally {
    await client.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
