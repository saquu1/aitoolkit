// =============================================================================
// AUTOMATED REPORT SCHEDULING API
// =============================================================================
// Manages automated weekly report generation and delivery schedules
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// =============================================================================
// TYPES
// =============================================================================

interface ReportSchedule {
  id: string;
  name: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  dayOfWeek?: number; // 0-6 for weekly
  dayOfMonth?: number; // 1-31 for monthly
  hour: number; // 0-23
  minute: number; // 0-59
  enabled: boolean;
  deliveryMethods: ('email' | 'slack' | 'webhook')[];
  recipients: string[];
  includeSections: string[];
  lastRun?: Date;
  nextRun?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// =============================================================================
// GET - List all schedules
// =============================================================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const scheduleId = searchParams.get('id');

    if (scheduleId) {
      // Get specific schedule
      const schedule = await getScheduleFromDb(scheduleId);
      
      if (!schedule) {
        return NextResponse.json(
          { error: 'Schedule not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        schedule,
      });
    }

    // Get all schedules
    const schedules = await getAllSchedules();

    return NextResponse.json({
      success: true,
      schedules,
      total: schedules.length,
    });
  } catch (error) {
    console.error('Schedule API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// =============================================================================
// POST - Create new schedule
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      frequency,
      dayOfWeek,
      dayOfMonth,
      hour,
      minute,
      deliveryMethods,
      recipients,
      includeSections,
    } = body;

    // Validate inputs
    if (!name || !frequency || !deliveryMethods || !recipients) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Calculate next run time
    const nextRun = calculateNextRun(frequency, dayOfWeek, dayOfMonth, hour, minute);

    // Create schedule
    const schedule = {
      id: `schedule-${Date.now()}`,
      name,
      frequency,
      dayOfWeek: dayOfWeek ?? 1, // Default Monday
      dayOfMonth: dayOfMonth ?? 1,
      hour: hour ?? 9, // Default 9 AM
      minute: minute ?? 0,
      enabled: true,
      deliveryMethods,
      recipients,
      includeSections: includeSections ?? ['summary', 'metrics', 'issues', 'patterns', 'recommendations'],
      nextRun,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Save to database (using AIAnalyticsSummary as schedule storage)
    await saveScheduleToDb(schedule);

    return NextResponse.json({
      success: true,
      message: 'Schedule created successfully',
      schedule,
    });
  } catch (error) {
    console.error('Create schedule error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// =============================================================================
// PUT - Update schedule
// =============================================================================

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Schedule ID required' },
        { status: 400 }
      );
    }

    // Recalculate next run if timing changed
    if (updates.frequency || updates.hour !== undefined || updates.minute !== undefined) {
      updates.nextRun = calculateNextRun(
        updates.frequency,
        updates.dayOfWeek,
        updates.dayOfMonth,
        updates.hour,
        updates.minute
      );
    }

    updates.updatedAt = new Date();

    await updateScheduleInDb(id, updates);

    return NextResponse.json({
      success: true,
      message: 'Schedule updated successfully',
    });
  } catch (error) {
    console.error('Update schedule error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// =============================================================================
// DELETE - Remove schedule
// =============================================================================

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Schedule ID required' },
        { status: 400 }
      );
    }

    await deleteScheduleFromDb(id);

    return NextResponse.json({
      success: true,
      message: 'Schedule deleted successfully',
    });
  } catch (error) {
    console.error('Delete schedule error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function calculateNextRun(
  frequency: string,
  dayOfWeek?: number,
  dayOfMonth?: number,
  hour?: number,
  minute?: number
): Date {
  const now = new Date();
  const next = new Date();
  
  // Set time
  next.setHours(hour ?? 9, minute ?? 0, 0, 0);

  switch (frequency) {
    case 'daily':
      // Run every day at specified time
      if (next <= now) {
        next.setDate(next.getDate() + 1);
      }
      break;

    case 'weekly':
      // Run on specified day of week
      const targetDay = dayOfWeek ?? 1; // Monday default
      const currentDay = next.getDay();
      const daysUntilTarget = (targetDay - currentDay + 7) % 7;
      
      if (daysUntilTarget === 0 && next <= now) {
        next.setDate(next.getDate() + 7);
      } else {
        next.setDate(next.getDate() + daysUntilTarget);
      }
      break;

    case 'monthly':
      // Run on specified day of month
      const targetDate = dayOfMonth ?? 1;
      next.setDate(targetDate);
      
      if (next <= now) {
        next.setMonth(next.getMonth() + 1);
      }
      break;
  }

  return next;
}

async function getScheduleFromDb(id: string): Promise<any> {
  try {
    const summary = await db.aIAnalyticsSummary.findUnique({
      where: { id },
    });

    if (!summary || summary.summaryType !== 'schedule') return null;

    return {
      id: summary.id,
      name: summary.summaryType,
      ...JSON.parse(summary.insights || '{}'),
      createdAt: summary.createdAt,
      updatedAt: summary.updatedAt,
    };
  } catch {
    return null;
  }
}

async function getAllSchedules(): Promise<any[]> {
  try {
    const summaries = await db.aIAnalyticsSummary.findMany({
      where: { summaryType: 'schedule' },
      orderBy: { createdAt: 'desc' },
    });

    return summaries.map(s => ({
      id: s.id,
      ...JSON.parse(s.insights || '{}'),
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    }));
  } catch {
    return [];
  }
}

async function saveScheduleToDb(schedule: any): Promise<void> {
  await db.aIAnalyticsSummary.create({
    data: {
      id: schedule.id,
      summaryType: 'schedule',
      summaryDate: schedule.nextRun,
      periodStart: schedule.createdAt,
      periodEnd: schedule.nextRun,
      totalSessions: 0,
      totalTokens: 0,
      totalCost: 0,
      avgDuration: 0,
      issuesCreated: 0,
      issuesResolved: 0,
      featuresImplemented: 0,
      filesModified: 0,
      efficiencyScore: 0,
      resolutionRate: 0,
      productivityScore: 0,
      costEfficiencyScore: 0,
      improvementScore: 0,
      sessionTrend: 0,
      costTrend: 0,
      issuesTrend: 0,
      featuresTrend: 0,
      insights: JSON.stringify(schedule),
    },
  });
}

async function updateScheduleInDb(id: string, updates: any): Promise<void> {
  const existing = await getScheduleFromDb(id);
  if (!existing) throw new Error('Schedule not found');

  const updated = { ...existing, ...updates };

  await db.aIAnalyticsSummary.update({
    where: { id },
    data: {
      summaryDate: updated.nextRun,
      periodEnd: updated.nextRun,
      insights: JSON.stringify(updated),
      updatedAt: new Date(),
    },
  });
}

async function deleteScheduleFromDb(id: string): Promise<void> {
  await db.aIAnalyticsSummary.delete({
    where: { id },
  });
}

// =============================================================================
// CRON EXECUTOR (Called by cron job or scheduled task)
// =============================================================================

export async function executeScheduledReports(): Promise<void> {
  const now = new Date();
  const schedules = await getAllSchedules();

  for (const schedule of schedules) {
    if (!schedule.enabled) continue;
    
    const nextRun = new Date(schedule.nextRun);
    if (nextRun <= now) {
      // Execute the report
      await generateAndDeliverReport(schedule);

      // Update next run time
      const newNextRun = calculateNextRun(
        schedule.frequency,
        schedule.dayOfWeek,
        schedule.dayOfMonth,
        schedule.hour,
        schedule.minute
      );

      await updateScheduleInDb(schedule.id, {
        lastRun: now,
        nextRun: newNextRun,
      });
    }
  }
}

async function generateAndDeliverReport(schedule: any): Promise<void> {
  // Generate the report
  const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/automation/reports`);
  const data = await response.json();

  if (!data.success) {
    console.error('Failed to generate report for schedule:', schedule.id);
    return;
  }

  // Deliver via configured methods
  for (const method of schedule.deliveryMethods) {
    switch (method) {
      case 'email':
        await deliverViaEmail(schedule.recipients, data.report);
        break;
      case 'slack':
        await deliverViaSlack(schedule.recipients, data.report);
        break;
      case 'webhook':
        await deliverViaWebhook(schedule.recipients, data.report);
        break;
    }
  }
}

async function deliverViaEmail(recipients: string[], report: any): Promise<void> {
  // Call email delivery API
  await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/automation/reports/email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ recipients, report }),
  });
}

async function deliverViaSlack(channels: string[], report: any): Promise<void> {
  // Implement Slack webhook delivery
  console.log('Delivering to Slack:', channels);
}

async function deliverViaWebhook(webhooks: string[], report: any): Promise<void> {
  for (const webhook of webhooks) {
    try {
      await fetch(webhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(report),
      });
    } catch (error) {
      console.error('Webhook delivery failed:', webhook, error);
    }
  }
}
