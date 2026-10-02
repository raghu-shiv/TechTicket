import 'reflect-metadata';

import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import {
  CreateSavedFilterDto,
} from '../src/modules/saved-filters/dto/create-saved-filter.dto';

describe('SavedFilter DTO validation', () => {
  async function validatePayload(payload: unknown) {
    const dto = plainToInstance(CreateSavedFilterDto, payload);

    return validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });
  }

  it('accepts a valid saved filter', async () => {
    const errors = await validatePayload({
      name: 'Open high priority tickets',
      description: 'Tickets requiring attention',
      filters: {
        status: 'OPEN',
        priority: 'HIGH',
        type: 'INCIDENT',
        assigneeId: 'cmtynxltv000jpq0v6zxzw53k',
        teamId: 'cmtynxltv000jpq0v6zxzw53k',
        requesterId: 'cmtynxltv000jpq0v6zxzw53k',
        unassigned: false,
        unassignedTeam: false,
        createdFrom: '2026-10-01T00:00:00.000Z',
        createdTo: '2026-10-02T00:00:00.000Z',
        updatedFrom: '2026-10-01T00:00:00.000Z',
        updatedTo: '2026-10-02T00:00:00.000Z',
        sortBy: 'updatedAt',
        sortOrder: 'desc',
        limit: 20,
      },
    });

    expect(errors).toHaveLength(0);
  });

  it('accepts valid status', async () => {
    const errors = await validatePayload({
      name: 'Open tickets',
      filters: {
        status: 'OPEN',
      },
    });

    expect(errors).toHaveLength(0);
  });

  it('rejects invalid status', async () => {
    const errors = await validatePayload({
      name: 'Invalid status',
      filters: {
        status: 'INVALID',
      },
    });

    expect(errors).not.toHaveLength(0);
  });

  it('accepts valid priority', async () => {
    const errors = await validatePayload({
      name: 'Urgent tickets',
      filters: {
        priority: 'URGENT',
      },
    });

    expect(errors).toHaveLength(0);
  });

  it('rejects invalid priority', async () => {
    const errors = await validatePayload({
      name: 'Invalid priority',
      filters: {
        priority: 'CRITICAL',
      },
    });

    expect(errors).not.toHaveLength(0);
  });

  it('accepts valid type', async () => {
    const errors = await validatePayload({
      name: 'Incident tickets',
      filters: {
        type: 'INCIDENT',
      },
    });

    expect(errors).toHaveLength(0);
  });

  it('rejects invalid type', async () => {
    const errors = await validatePayload({
      name: 'Invalid type',
      filters: {
        type: 'BUG',
      },
    });

    expect(errors).not.toHaveLength(0);
  });

  it('accepts valid sort field', async () => {
    const errors = await validatePayload({
      name: 'Recently updated',
      filters: {
        sortBy: 'updatedAt',
      },
    });

    expect(errors).toHaveLength(0);
  });

  it('rejects invalid sort field', async () => {
    const errors = await validatePayload({
      name: 'Invalid sort',
      filters: {
        sortBy: 'createdBy',
      },
    });

    expect(errors).not.toHaveLength(0);
  });

  it('accepts valid sort order', async () => {
    const errors = await validatePayload({
      name: 'Ascending tickets',
      filters: {
        sortOrder: 'asc',
      },
    });

    expect(errors).toHaveLength(0);
  });

  it('rejects invalid sort order', async () => {
    const errors = await validatePayload({
      name: 'Invalid order',
      filters: {
        sortOrder: 'ascending',
      },
    });

    expect(errors).not.toHaveLength(0);
  });

  it('accepts limit 1', async () => {
    const errors = await validatePayload({
      name: 'Minimum page size',
      filters: {
        limit: 1,
      },
    });

    expect(errors).toHaveLength(0);
  });

  it('accepts limit 100', async () => {
    const errors = await validatePayload({
      name: 'Maximum page size',
      filters: {
        limit: 100,
      },
    });

    expect(errors).toHaveLength(0);
  });

  it('rejects limit 0', async () => {
    const errors = await validatePayload({
      name: 'Invalid limit',
      filters: {
        limit: 0,
      },
    });

    expect(errors).not.toHaveLength(0);
  });

  it('rejects limit above 100', async () => {
    const errors = await validatePayload({
      name: 'Invalid limit',
      filters: {
        limit: 101,
      },
    });

    expect(errors).not.toHaveLength(0);
  });

  it('accepts ISO dates', async () => {
    const errors = await validatePayload({
      name: 'Date filtered tickets',
      filters: {
        createdFrom: '2026-10-01T00:00:00.000Z',
        createdTo: '2026-10-02T00:00:00.000Z',
        updatedFrom: '2026-10-01T00:00:00.000Z',
        updatedTo: '2026-10-02T00:00:00.000Z',
      },
    });

    expect(errors).toHaveLength(0);
  });

  it('rejects invalid dates', async () => {
    const errors = await validatePayload({
      name: 'Invalid dates',
      filters: {
        createdFrom: 'not-a-date',
      },
    });

    expect(errors).not.toHaveLength(0);
  });

  it('accepts CUID-style IDs', async () => {
    const errors = await validatePayload({
      name: 'Assigned tickets',
      filters: {
        assigneeId: 'cmtynxltv000jpq0v6zxzw53k',
        teamId: 'cmtynxltv000jpq0v6zxzw53k',
        requesterId: 'cmtynxltv000jpq0v6zxzw53k',
      },
    });

    expect(errors).toHaveLength(0);
  });

  it('rejects page from the saved-filter definition', async () => {
    const errors = await validatePayload({
      name: 'Page should not persist',
      filters: {
        status: 'OPEN',
        page: 2,
      },
    });

    expect(errors).not.toHaveLength(0);
  });

  it('rejects unknown filter properties', async () => {
    const errors = await validatePayload({
      name: 'Unknown property',
      filters: {
        status: 'OPEN',
        someUnknownFilter: true,
      },
    });

    expect(errors).not.toHaveLength(0);
  });
});
