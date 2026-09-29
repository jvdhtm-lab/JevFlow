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
    provider: {
      title: 'Provider',
      type: 'string',
      enum: ['local', 'google', 'github', 'x', 'outlook', 'slack'],
      'x-vhrs-sortable': true,
      filterable: true,
      sortable: true,
    },
    provider_uid: {
      title: 'Provider uid',
      type: 'string',
      maxLength: 200,
      minLength: 1,
      'x-vhrs-sortable': true,
      filterable: true,
      sortable: true,
    },
    extra_data: { title: 'Extra data', type: 'object', 'x-nullable': true },
    access_token: {
      title: 'Access token',
      type: 'string',
      'x-nullable': true,
      'x-vhrs-sortable': true,
      sortable: true,
    },
    refresh_token: {
      title: 'Refresh token',
      type: 'string',
      'x-nullable': true,
      'x-vhrs-sortable': true,
      sortable: true,
    },
    expires_at: {
      title: 'Expires at',
      type: 'string',
      format: 'date-time',
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

  required: ['user', 'provider', 'provider_uid'],
};
