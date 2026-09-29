import type { Models, ResourceObject } from '../../types';

const mockType = (): Models['OAuthProvider'] | undefined => {
  return;
};

export const OAuthProvider: ResourceObject = {
  baseUrl: '/oauth-provider/',
  relatedurls: ['/oauth-provider/', '/oauth-provider/{id}/'],
  name: 'OAuthProvider',
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
    provider: {
      title: 'Provider',
      type: 'string',
      enum: ['local', 'google', 'github', 'x', 'outlook', 'slack'],
      'x-vhrs-sortable': true,
      filterable: true,
      sortable: true,
    },
    client_id: {
      title: 'Client id',
      type: 'string',
      maxLength: 500,
      'x-vhrs-sortable': true,
      sortable: true,
    },
    client_secret: {
      title: 'Client secret',
      type: 'string',
      'x-vhrs-sortable': true,
      sortable: true,
    },
    is_active: {
      title: 'Is active',
      type: 'boolean',
      'x-vhrs-sortable': true,
      filterable: true,
      sortable: true,
    },
    configured: {
      title: 'Configured',
      type: 'string',
      readOnly: true,
      'x-vhrs-sortable': true,
      sortable: true,
    },
    config: { title: 'Config', type: 'object', 'x-nullable': true },
    status: {
      title: 'Status',
      type: 'string',
      enum: ['activated', 'deactivated', 'pending', 'confirmed', 'archived'],
      'x-vhrs-sortable': true,
      filterable: true,
      sortable: true,
    },
  },

  required: ['provider'],
};
