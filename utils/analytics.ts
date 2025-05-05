import { Document, Model } from "mongoose";

interface MonthData {
  month: string;
  count: number;
}

export const generateLast12MonthsData = async <T extends Document>(
  model: Model<T>
): Promise<{ last12Months: MonthData[] }> => {
  const currentDate = new Date();
  currentDate.setDate(1);

  const last12Months: MonthData[] = [];

  const months = Array.from({ length: 12 }, (_, i) => {
    const date = new Date(currentDate);
    date.setMonth(currentDate.getMonth() - (11 - i));
    return {
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      label: date.toLocaleString("default", {
        month: "short",
        year: "numeric",
      }),
    };
  });

  const minDate = new Date(months[0].year, months[0].month - 1, 1);
  const maxDate = new Date(months[11].year, months[11].month, 1);

  const results = await model.aggregate([
    {
      $match: {
        createdAt: { $gte: minDate, $lt: maxDate },
      },
    },
    {
      $group: {
        _id: {
          year: { $year: "$createdAt" },
          month: { $month: "$createdAt" },
        },
        count: { $sum: 1 },
      },
    },
    { $sort: { "_id.year": 1, "_id.month": 1 } },
  ]);

  months.forEach(({ year, month, label }) => {
    const found = results.find(
      (r) => r._id.year === year && r._id.month === month
    );
    last12Months.push({ month: label, count: found ? found.count : 0 });
  });

  return { last12Months };
};
