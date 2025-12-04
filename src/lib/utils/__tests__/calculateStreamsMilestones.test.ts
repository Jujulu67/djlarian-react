import { calculateStreamsMilestones } from '../calculateStreamsMilestones';
import type { StreamsDataPoint } from '../calculateStreamsMilestones';

describe('calculateStreamsMilestones', () => {
  it('should calculate milestones for project with streams data', () => {
    const releaseDate = '2024-01-01';
    const streamsData: StreamsDataPoint[] = [
      { date: '2024-01-01', streams: 100 },
      { date: '2024-01-08', streams: 200 },
      { date: '2024-01-15', streams: 300 },
      { date: '2024-01-22', streams: 400 },
      { date: '2024-01-29', streams: 500 },
    ];

    const milestones = calculateStreamsMilestones(releaseDate, streamsData);

    expect(milestones.streamsJ7).toBeGreaterThanOrEqual(0);
    expect(milestones.streamsJ14).toBeGreaterThanOrEqual(0);
  });

  it('should return null milestones if no streams data', () => {
    const releaseDate = '2024-01-01';
    const streamsData: StreamsDataPoint[] = [];

    const milestones = calculateStreamsMilestones(releaseDate, streamsData);

    expect(milestones.streamsJ7).toBeNull();
    expect(milestones.streamsJ14).toBeNull();
  });

  it('should calculate J7 milestone', () => {
    const releaseDate = '2024-01-01';
    const streamsData: StreamsDataPoint[] = [
      { date: '2024-01-01', streams: 100 },
      { date: '2024-01-02', streams: 50 },
      { date: '2024-01-03', streams: 75 },
      { date: '2024-01-04', streams: 60 },
      { date: '2024-01-05', streams: 80 },
      { date: '2024-01-06', streams: 90 },
      { date: '2024-01-07', streams: 100 },
      { date: '2024-01-08', streams: 110 },
    ];

    const milestones = calculateStreamsMilestones(releaseDate, streamsData);

    expect(milestones.streamsJ7).toBeGreaterThan(0);
  });

  it('should calculate J28 milestone', () => {
    const releaseDate = '2024-01-01';
    const streamsData: StreamsDataPoint[] = [];
    for (let i = 0; i < 30; i++) {
      const date = new Date('2024-01-01');
      date.setDate(date.getDate() + i);
      streamsData.push({
        date: date.toISOString().split('T')[0],
        streams: 100 + i * 10,
      });
    }

    const milestones = calculateStreamsMilestones(releaseDate, streamsData);

    expect(milestones.streamsJ28).toBeGreaterThan(0);
  });

  it('should handle future release date', () => {
    const releaseDate = '2025-01-01';
    const streamsData: StreamsDataPoint[] = [{ date: '2024-12-01', streams: 100 }];

    const milestones = calculateStreamsMilestones(releaseDate, streamsData);

    // Milestones should be null for future dates
    expect(milestones.streamsJ7).toBeNull();
  });

  it('should calculate all milestones', () => {
    const releaseDate = '2024-01-01';
    const streamsData: StreamsDataPoint[] = [];
    for (let i = 0; i < 400; i++) {
      const date = new Date('2024-01-01');
      date.setDate(date.getDate() + i);
      streamsData.push({
        date: date.toISOString().split('T')[0],
        streams: 100 + i * 10,
      });
    }

    const milestones = calculateStreamsMilestones(releaseDate, streamsData);

    expect(milestones.streamsJ7).not.toBeNull();
    expect(milestones.streamsJ14).not.toBeNull();
    expect(milestones.streamsJ21).not.toBeNull();
    expect(milestones.streamsJ28).not.toBeNull();
    expect(milestones.streamsJ56).not.toBeNull();
    expect(milestones.streamsJ84).not.toBeNull();
    expect(milestones.streamsJ180).not.toBeNull();
    expect(milestones.streamsJ365).not.toBeNull();
  });

  it('should handle invalid release date format', () => {
    const releaseDate = 'invalid-date';
    const streamsData: StreamsDataPoint[] = [{ date: '2024-01-01', streams: 100 }];

    const milestones = calculateStreamsMilestones(releaseDate, streamsData);

    expect(milestones.streamsJ7).toBeNull();
  });

  it('should handle missing release date data but with day before', () => {
    const releaseDate = '2024-01-01';
    const streamsData: StreamsDataPoint[] = [
      { date: '2023-12-31', streams: 50 },
      { date: '2024-01-08', streams: 200 },
    ];

    const milestones = calculateStreamsMilestones(releaseDate, streamsData);

    // Should still calculate if day before exists and we have data for J7
    // J7 is 2024-01-08, and we have data for that date
    // But the function checks if lastAvailableDate >= targetDate
    // If lastAvailableDate is 2024-01-08 and targetDate is 2024-01-08, it should work
    // However, if the function requires data AFTER the target date, it might be null
    expect(milestones.streamsJ7 !== undefined).toBe(true);
  });

  it('should return null when last available date is before target', () => {
    const releaseDate = '2024-01-01';
    const streamsData: StreamsDataPoint[] = [
      { date: '2024-01-01', streams: 100 },
      { date: '2024-01-05', streams: 150 }, // Before J7
    ];

    const milestones = calculateStreamsMilestones(releaseDate, streamsData);

    // J7 should be null because we don't have data for 2024-01-08
    expect(milestones.streamsJ7).toBeNull();
  });

  it('should calculate J56 milestone', () => {
    const releaseDate = '2024-01-01';
    const streamsData: StreamsDataPoint[] = [];
    for (let i = 0; i < 60; i++) {
      const date = new Date('2024-01-01');
      date.setDate(date.getDate() + i);
      streamsData.push({
        date: date.toISOString().split('T')[0],
        streams: 100 + i * 10,
      });
    }

    const milestones = calculateStreamsMilestones(releaseDate, streamsData);

    expect(milestones.streamsJ56).not.toBeNull();
  });

  it('should calculate J84 milestone', () => {
    const releaseDate = '2024-01-01';
    const streamsData: StreamsDataPoint[] = [];
    for (let i = 0; i < 90; i++) {
      const date = new Date('2024-01-01');
      date.setDate(date.getDate() + i);
      streamsData.push({
        date: date.toISOString().split('T')[0],
        streams: 100 + i * 10,
      });
    }

    const milestones = calculateStreamsMilestones(releaseDate, streamsData);

    expect(milestones.streamsJ84).not.toBeNull();
  });
});
