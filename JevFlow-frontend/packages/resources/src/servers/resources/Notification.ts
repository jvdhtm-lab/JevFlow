import type { Models, ResourceObject } from '../../types';

const mockType = (): Models['Notification'] | undefined => {
  return;
};

export const Notification: ResourceObject = {
  baseUrl: '/notification/',
  relatedurls: ['/notification/', '/notification/{id}/'],
  name: 'Notification',
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
    recipient: {
      title: 'Recipient',
      type: 'integer',
      'x-vhrs-sortable': true,
      'x-vhrs-relatedResource': 'identity_api.CustomUser',
      filterable: true,
      sortable: true,
    },
    title: {
      title: 'Title',
      type: 'string',
      maxLength: 200,
      minLength: 1,
      'x-vhrs-sortable': true,
      filterable: true,
      sortable: true,
    },
    message: {
      title: 'Message',
      type: 'string',
      minLength: 1,
      'x-vhrs-sortable': true,
      sortable: true,
    },
    notification_type: {
      title: 'Notification type',
      type: 'string',
      enum: [
        'integration_connected',
        'integration_error',
        'webhook_received',
        'decision_made',
        'decision_escalated',
        'approval_needed',
        'system',
      ],
      'x-vhrs-sortable': true,
      filterable: true,
      sortable: true,
    },
    is_read: {
      title: 'Is read',
      type: 'boolean',
      'x-vhrs-sortable': true,
      filterable: true,
      sortable: true,
    },
    read_at: {
      title: 'Read at',
      type: 'string',
      format: 'date-time',
      'x-nullable': true,
      'x-vhrs-sortable': true,
      sortable: true,
    },
    related_object_type: {
      title: 'Related object type',
      type: 'string',
      maxLength: 100,
      'x-nullable': true,
      'x-vhrs-sortable': true,
      sortable: true,
    },
    related_object_id: {
      title: 'Related object id',
      type: 'integer',
      maximum: 2147483647,
      minimum: -2147483648,
      'x-nullable': true,
      'x-vhrs-sortable': true,
      sortable: true,
    },
    action_url: {
      title: 'Action url',
      type: 'string',
      maxLength: 500,
      'x-nullable': true,
      'x-vhrs-sortable': true,
      sortable: true,
    },
    created_at: {
      title: 'Created at',
      type: 'string',
      format: 'date-time',
      readOnly: true,
      'x-vhrs-sortable': true,
      sortable: true,
    },
  },

  required: ['recipient', 'title', 'message', 'notification_type'],
};
