/**
 * Community Reward Service
 *
 * Handles shared class goals where students can donate points collectively.
 * Features:
 * - Manual donations via Poengsentral/POS
 * - Automatic percentage deductions when students earn points
 * - Multiple active goals support
 * - Achievement celebration and history
 */

import { db } from './db';
import type { CommunityReward, CommunityDonation, Student } from './types';

export type DonationResult = {
  success: boolean;
  message: string;
  newBalance?: number;
  rewardAchieved?: boolean;
  rewardTitle?: string;
};

/**
 * Get all active community rewards sorted by priority
 */
export async function getActiveCommunityRewards(): Promise<CommunityReward[]> {
  return await db.communityRewards
    .where('status')
    .equals('active')
    .sortBy('priority');
}

/**
 * Get all achieved community rewards
 */
export async function getAchievedCommunityRewards(): Promise<CommunityReward[]> {
  return await db.communityRewards
    .where('status')
    .equals('achieved')
    .reverse()
    .sortBy('achievedAt');
}

/**
 * Get donations for a specific reward
 */
export async function getDonationsForReward(rewardId: number): Promise<CommunityDonation[]> {
  return await db.communityDonations
    .where('rewardId')
    .equals(rewardId)
    .toArray();
}

/**
 * Get donation breakdown by student for a specific reward (for teacher view)
 */
export async function getDonationBreakdown(rewardId: number): Promise<Array<{
  student: Student;
  totalDonated: number;
  donationCount: number;
  lastDonation?: Date;
}>> {
  const donations = await getDonationsForReward(rewardId);
  const students = await db.students.toArray();

  // Group donations by student
  const donationsByStudent = donations.reduce((acc, donation) => {
    if (!acc[donation.studentId]) {
      acc[donation.studentId] = [];
    }
    acc[donation.studentId].push(donation);
    return acc;
  }, {} as Record<number, CommunityDonation[]>);

  // Build breakdown array
  const breakdown = Object.entries(donationsByStudent).map(([studentId, studentDonations]) => {
    const student = students.find(s => s.id === parseInt(studentId));
    if (!student) return null;

    const totalDonated = studentDonations.reduce((sum, d) => sum + d.amount, 0);
    const lastDonation = studentDonations.length > 0
      ? new Date(Math.max(...studentDonations.map(d => d.date.getTime())))
      : undefined;

    return {
      student,
      totalDonated,
      donationCount: studentDonations.length,
      lastDonation,
    };
  }).filter(Boolean) as Array<{
    student: Student;
    totalDonated: number;
    donationCount: number;
    lastDonation?: Date;
  }>;

  // Sort by total donated (descending)
  return breakdown.sort((a, b) => b.totalDonated - a.totalDonated);
}

/**
 * Make a manual donation to a community reward
 * @param studentId - Student making the donation
 * @param rewardId - Community reward to donate to
 * @param amount - Amount to donate
 * @param cardId - Optional NFC card ID if donated via NFC
 */
export async function makeDonation(
  studentId: number,
  rewardId: number,
  amount: number,
  cardId?: string
): Promise<DonationResult> {
  try {
    // Validate inputs
    if (!studentId || !rewardId || amount <= 0) {
      return {
        success: false,
        message: 'Ugyldige donasjonsdetaljer',
      };
    }

    // Get student
    const student = await db.students.get(studentId);
    if (!student) {
      return {
        success: false,
        message: 'Finner ikke eleven',
      };
    }

    // Check balance
    const currentBalance = student.points || 0;
    if (currentBalance < amount) {
      return {
        success: false,
        message: `Ikke nok poeng. ${student.name} har ${currentBalance} poeng.`,
      };
    }

    // Get reward
    const reward = await db.communityRewards.get(rewardId);
    if (!reward) {
      return {
        success: false,
        message: 'Finner ikke fellesspotten',
      };
    }

    if (reward.status !== 'active') {
      return {
        success: false,
        message: 'Denne fellesspotten er ikke aktiv',
      };
    }

    // Deduct points from student
    const newBalance = currentBalance - amount;
    await db.students.update(studentId, { points: newBalance });

    // Add donation record
    const donation: CommunityDonation = {
      studentId,
      rewardId,
      amount,
      donationType: 'manual',
      date: new Date(),
      cardId,
    };
    await db.communityDonations.add(donation);

    // Update reward's current amount
    const newAmount = reward.currentAmount + amount;
    await db.communityRewards.update(rewardId, { currentAmount: newAmount });

    // Sync to display API (for Klasseflyt-display børs view)
    syncCommunityRewardToApi();

    // Check if goal is achieved
    let rewardAchieved = false;
    if (newAmount >= reward.target) {
      await achieveReward(rewardId);
      rewardAchieved = true;
    }

    return {
      success: true,
      message: `${student.name} donerte ${amount} poeng til "${reward.title}"`,
      newBalance,
      rewardAchieved,
      rewardTitle: reward.title,
    };
  } catch (error) {
    console.error('Error making donation:', error);
    return {
      success: false,
      message: 'En feil oppstod ved donasjon',
    };
  }
}

/**
 * Sync community reward progress to display API
 */
async function syncCommunityRewardToApi() {
  try {
    const apiKey = process.env.NEXT_PUBLIC_API_SECRET_KEY;
    if (!apiKey) {
      console.warn('⚠️ API_SECRET_KEY not set, skipping community reward sync');
      return;
    }

    const borsId = localStorage.getItem('klasseflyt_bors_id');
    if (!borsId) {
      console.warn('⚠️ Børs-ID not set in localStorage, skipping community reward sync');
      return;
    }

    // Get active community rewards
    const activeCommunityRewards = await db.communityRewards
      .where('status')
      .equals('active')
      .sortBy('priority');

    if (!activeCommunityRewards || activeCommunityRewards.length === 0) {
      return;
    }

    // Get rewards for complete data
    const rewards = await db.rewards.toArray();

    // Use the first active community reward (highest priority)
    const topReward = activeCommunityRewards[0];
    const classGoal = {
      current: topReward.currentAmount,
      target: topReward.target,
      title: topReward.title
    };

    console.log('📤 Syncing community reward to API...', classGoal);

    const response = await fetch('/api/prices', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        borsId,
        rewards,
        classGoal
      }),
    });

    if (response.ok) {
      console.log('✅ Community reward synced to display API');
    } else {
      console.error('❌ Failed to sync community reward:', response.status);
    }
  } catch (error) {
    console.error('❌ Failed to sync community reward to API:', error);
  }
}

/**
 * Process automatic donation based on student's auto-contribution percentage
 * Called when a student earns points
 * @param studentId - Student who earned points
 * @param earnedAmount - Amount of points earned
 * @returns The amount that was auto-donated (0 if no auto-contribution set up)
 */
export async function processAutoContribution(
  studentId: number,
  earnedAmount: number
): Promise<number> {
  try {
    // Get student
    const student = await db.students.get(studentId);
    if (!student) return 0;

    // Check if student has auto-contribution enabled
    const autoPercent = student.autoContributionPercent || 0;
    if (autoPercent <= 0) return 0;

    // Check if student has a preferred community reward
    const preferredRewardId = student.preferredCommunityRewardId;
    if (!preferredRewardId) return 0;

    // Check if the preferred reward is still active
    const reward = await db.communityRewards.get(preferredRewardId);
    if (!reward || reward.status !== 'active') return 0;

    // Calculate auto-donation amount
    const autoAmount = Math.floor(earnedAmount * (autoPercent / 100));
    if (autoAmount <= 0) return 0;

    // Create auto-donation record
    const donation: CommunityDonation = {
      studentId,
      rewardId: preferredRewardId,
      amount: autoAmount,
      donationType: 'auto',
      date: new Date(),
    };
    await db.communityDonations.add(donation);

    // Update reward's current amount
    const newAmount = reward.currentAmount + autoAmount;
    await db.communityRewards.update(preferredRewardId, { currentAmount: newAmount });

    // Sync to display API
    syncCommunityRewardToApi();

    // Check if goal is achieved
    if (newAmount >= reward.target) {
      await achieveReward(preferredRewardId);
    }

    return autoAmount;
  } catch (error) {
    console.error('Error processing auto-contribution:', error);
    return 0;
  }
}

/**
 * Mark a community reward as achieved
 * @param rewardId - The reward that was achieved
 */
async function achieveReward(rewardId: number): Promise<void> {
  await db.communityRewards.update(rewardId, {
    status: 'achieved',
    achievedAt: new Date(),
  });
}

/**
 * Create a new community reward
 */
export async function createCommunityReward(
  title: string,
  target: number,
  description?: string,
  emoji?: string
): Promise<number> {
  // Get the highest priority to add new reward at the end
  const existingRewards = await db.communityRewards.toArray();
  const maxPriority = existingRewards.length > 0
    ? Math.max(...existingRewards.map(r => r.priority))
    : 0;

  const reward: CommunityReward = {
    title,
    description,
    target,
    currentAmount: 0,
    emoji,
    status: 'active',
    createdAt: new Date(),
    priority: maxPriority + 1,
  };

  const id = await db.communityRewards.add(reward);
  return id as number;
}

/**
 * Update a community reward
 */
export async function updateCommunityReward(
  rewardId: number,
  updates: Partial<CommunityReward>
): Promise<void> {
  await db.communityRewards.update(rewardId, updates);
}

/**
 * Delete a community reward (only if not achieved)
 */
export async function deleteCommunityReward(rewardId: number): Promise<boolean> {
  const reward = await db.communityRewards.get(rewardId);
  if (!reward) return false;

  // Don't allow deleting achieved rewards (they're history)
  if (reward.status === 'achieved') return false;

  await db.communityRewards.delete(rewardId);

  // Delete all donations for this reward
  const donations = await db.communityDonations
    .where('rewardId')
    .equals(rewardId)
    .toArray();

  for (const donation of donations) {
    if (donation.id) {
      await db.communityDonations.delete(donation.id);
    }
  }

  return true;
}

/**
 * Reset an achieved reward (set back to active with 0 progress)
 */
export async function resetCommunityReward(rewardId: number): Promise<void> {
  await db.communityRewards.update(rewardId, {
    status: 'active',
    currentAmount: 0,
    achievedAt: undefined,
  });
}

/**
 * Update student's auto-contribution settings
 */
export async function updateStudentAutoContribution(
  studentId: number,
  autoContributionPercent: number,
  preferredCommunityRewardId?: number
): Promise<void> {
  await db.students.update(studentId, {
    autoContributionPercent,
    preferredCommunityRewardId,
  });
}
