import type { ActivityType } from '@copa/shared';

export * from '@copa/shared';

export interface Activity {
  uid: string;
  tournamentId: string;
  type: ActivityType;
  refId: string;
  createdAt: number;
}
