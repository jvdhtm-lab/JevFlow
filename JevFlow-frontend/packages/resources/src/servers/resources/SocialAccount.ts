import type { Models, ResourceObject } from '../../types';

const mockType = (): Models['SocialAccount'] | undefined => {
  return;
};

export const SocialAccount: ResourceObject = {
  baseUrl: '/social-account/',
  relatedurls: ['/social-account/', '/social-account/{id}/'],
  name: 'SocialAccount',
  type: mockType,
  fields: {
    id: { title: 'ID', type: 'integer', readOnly: true, filterable: true },
    user: {
      title: 'User',
      type: 'integer',
      'x-vhrs-relatedResource': 'identity_api.CustomUser',
      filterable: true,
    },
    provider: {
      title: 'Provider',
      type: 'string',
      enum: ['local', 'google', 'github', 'x', 'outlook', 'slack'],
      filterable: true,
    },
    provider_uid: {
      title: 'Provider uid',
      type: 'string',
      maxLength: 200,
      minLength: 1,
      filterable: true,
    },
    extra_data: { title: 'Extra data', type: 'object', 'x-nullable': true },
    access_token: { title: 'Access token', type: 'string', 'x-nullable': true },
    refresh_token: {
      title: 'Refresh token',
      type: 'string',
      'x-nullable': true,
    },
    expires_at: {
      title: 'Expires at',
      type: 'string',
      format: 'date-time',
      'x-nullable': true,
    },
    status: {
      title: 'Status',
      type: 'string',
      enum: ['activated', 'deactivated', 'pending', 'confirmed', 'archived'],
    },
  },

  required: ['user', 'provider', 'provider_uid'],
};
