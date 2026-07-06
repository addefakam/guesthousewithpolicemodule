import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const where: Record<string, unknown> = {};

    if (category) where.category = category;
    if (from || to) {
      const dateFilter: Record<string, unknown> = {};
      if (from) dateFilter.gte = from;
      if (to) dateFilter.lte = to;
      where.date = dateFilter;
    }

    const expenses = await db.expense.findMany({
      where,
      orderBy: { date: "desc" },
    });
    return NextResponse.json(expenses);
  } catch (error) {
    console.error("Expenses GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { date, category, description, amount, vendor, paymentMethod, receiptNo, taxAmount } = body;

    if (!date || !category || !description || amount === undefined) {
      return NextResponse.json({ error: "Date, category, description, and amount are required" }, { status: 400 });
    }

    const expense = await db.expense.create({
      data: {
        date,
        category,
        description,
        amount: parseFloat(amount),
        vendor: vendor || "",
        paymentMethod: paymentMethod || "CASH",
        receiptNo: receiptNo || "",
        taxAmount: parseFloat(taxAmount) || 0,
      },
    });

    return NextResponse.json(expense, { status: 201 });
  } catch (error) {
    console.error("Expenses POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, amount, taxAmount, ...data } = body;

    if (!id) {
      return NextResponse.json({ error: "Expense ID is required" }, { status: 400 });
    }

    if (amount !== undefined) data.amount = parseFloat(amount);
    if (taxAmount !== undefined) data.taxAmount = parseFloat(taxAmount);

    const expense = await db.expense.update({
      where: { id },
      data,
    });

    return NextResponse.json(expense);
  } catch (error: unknown) {
    console.error("Expenses PUT error:", error);
    const prismaError = error as { code?: string };
    if (prismaError.code === "P2025") {
      return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Expense ID is required" }, { status: 400 });
    }

    await db.expense.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Expenses DELETE error:", error);
    const prismaError = error as { code?: string };
    if (prismaError.code === "P2025") {
      return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}