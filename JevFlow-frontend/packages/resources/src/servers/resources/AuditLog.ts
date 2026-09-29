import type { Models, ResourceObject } from '../../types';

const mockType = (): Models['AuditLog'] | undefined => {
  return;
};

export const AuditLog: ResourceObject = {
  baseUrl: '/audit-log/',
  relatedurls: ['/audit-log/', '/audit-log/{id}/'],
  name: 'AuditLog',
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
      'x-nullable': true,
      'x-vhrs-sortable': true,
      'x-vhrs-relatedResource': 'identity_api.CustomUser',
      filterable: true,
      sortable: true,
    },
    action: {
      title: 'Action',
      type: 'string',
      enum: [
        'CREATE',
        'UPDATE',
        'DELETE',
        'VIEW',
        'LOGIN',
        'LOGOUT',
        'WEBHOOK',
        'DECISION',
      ],
      'x-vhrs-sortable': true,
      filterable: true,
      sortable: true,
    },
    model_name: {
      title: 'Model name',
      type: 'string',
      maxLength: 100,
      minLength: 1,
      'x-vhrs-sortable': true,
      filterable: true,
      sortable: true,
    },
    object_id: {
      title: 'Object id',
      type: 'integer',
      maximum: 2147483647,
      minimum: -2147483648,
      'x-nullable': true,
      'x-vhrs-sortable': true,
      filterable: true,
      sortable: true,
    },
    object_repr: {
      title: 'Object repr',
      type: 'string',
      maxLength: 200,
      'x-nullable': true,
      'x-vhrs-sortable': true,
      filterable: true,
      sortable: true,
    },
    changes: {
      title: 'Changes',
      description: 'Store before/after values as JSON',
      type: 'object',
      'x-nullable': true,
    },
    timestamp: {
      title: 'Timestamp',
      type: 'string',
      format: 'date-time',
      readOnly: true,
      'x-vhrs-sortable': true,
      sortable: true,
    },
    ip_address: {
      title: 'Ip address',
      type: 'string',
      minLength: 1,
      'x-nullable': true,
      'x-vhrs-sortable': true,
      sortable: true,
    },
    user_agent: {
      title: 'User agent',
      type: 'string',
      'x-nullable': true,
      'x-vhrs-sortable': true,
      sortable: true,
    },
  },

  required: ['action', 'model_name'],
};
