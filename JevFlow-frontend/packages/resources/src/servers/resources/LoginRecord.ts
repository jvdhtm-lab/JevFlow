import type { Models, ResourceObject } from '../../types';

const mockType = (): Models['LoginRecord'] | undefined => {
  return;
};

export const LoginRecord: ResourceObject = {
  baseUrl: '/login/',
  relatedurls: ['/login/', '/login/{id}/'],
  name: 'LoginRecord',
  type: mockType,
  fields: {
    id: { title: 'ID', type: 'integer', readOnly: true, filterable: true },
    user: {
      title: 'User',
      type: 'integer',
      'x-vhrs-relatedResource': 'identity_api.CustomUser',
      filterable: true,
    },
    timestamp: {
      title: 'Timestamp',
      type: 'string',
      format: 'date-time',
      readOnly: true,
    },
    provider: {
      title: 'Provider',
      type: 'string',
      enum: ['local', 'google', 'github', 'x', 'outlook', 'slack'],
      filterable: true,
    },
    ip: { title: 'Ip', type: 'string', minLength: 1, 'x-nullable': true },
    status: {
      title: 'Status',
      type: 'string',
      enum: ['activated', 'deactivated', 'pending', 'confirmed', 'archived'],
    },
  },

  required: ['user'],
};
