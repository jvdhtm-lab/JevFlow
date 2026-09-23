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
    id: { title: 'ID', type: 'integer', readOnly: true, filterable: true },
    provider: {
      title: 'Provider',
      type: 'string',
      enum: ['local', 'google', 'github', 'x', 'outlook', 'slack'],
      filterable: true,
    },
    client_id: { title: 'Client id', type: 'string', maxLength: 500 },
    client_secret: { title: 'Client secret', type: 'string' },
    is_active: { title: 'Is active', type: 'boolean', filterable: true },
    configured: { title: 'Configured', type: 'string', readOnly: true },
    config: { title: 'Config', type: 'object', 'x-nullable': true },
    status: {
      title: 'Status',
      type: 'string',
      enum: ['activated', 'deactivated', 'pending', 'confirmed', 'archived'],
      filterable: true,
    },
  },

  required: ['provider'],
};
