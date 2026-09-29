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
    id: {
      title: 'ID',
      type: 'integer',
      readOnly: true,
      'x-vhrs-sortable': true,
      filterable: true,
      sortable: true,
    },
    user: {
      title: 'User',
      type: 'integer',
      'x-vhrs-sortable': true,
      'x-vhrs-relatedResource': 'identity_api.CustomUser',
      filterable: true,
      sortable: true,
    },
    timestamp: {
      title: 'Timestamp',
      type: 'string',
      format: 'date-time',
      readOnly: true,
      'x-vhrs-sortable': true,
      sortable: true,
    },
    provider: {
      title: 'Provider',
      type: 'string',
      enum: ['local', 'google', 'github', 'x', 'outlook', 'slack'],
      'x-vhrs-sortable': true,
      filterable: true,
      sortable: true,
    },
    ip: {
      title: 'Ip',
      type: 'string',
      minLength: 1,
      'x-nullable': true,
      'x-vhrs-sortable': true,
      sortable: true,
    },
    status: {
      title: 'Status',
      type: 'string',
      enum: ['activated', 'deactivated', 'pending', 'confirmed', 'archived'],
      'x-vhrs-sortable': true,
      sortable: true,
    },
  },

  required: ['user'],
};
