import type { Models, ResourceObject } from '../../types';

const mockType = (): Models['DecisionRun'] | undefined => {
  return;
};

export const DecisionRun: ResourceObject = {
  baseUrl: '/decision-run/',
  relatedurls: ['/decision-run/', '/decision-run/{id}/'],
  name: 'DecisionRun',
  type: mockType,
  fields: {
    id: { title: 'ID', type: 'integer', readOnly: true, filterable: true },
    name: { title: 'Name', type: 'string', maxLength: 100, 'x-nullable': true },
    description: { title: 'Description', type: 'string', 'x-nullable': true },
    map: {
      title: 'Map',
      type: 'integer',
      'x-vhrs-relatedResource': 'decisions.DecisionMap',
      filterable: true,
    },
    trigger_event: {
      title: 'Trigger event',
      type: 'object',
      'x-nullable': true,
    },
    status: {
      title: 'Status',
      type: 'string',
      enum: ['pending', 'running', 'decided', 'escalated', 'failed'],
      filterable: true,
    },
    answers: { title: 'Answers', type: 'object', 'x-nullable': true },
    decided_route: {
      title: 'Decided route',
      type: 'string',
      maxLength: 30,
      'x-nullable': true,
      filterable: true,
    },
    confidence: { title: 'Confidence', type: 'number', 'x-nullable': true },
    executed_action: {
      title: 'Executed action',
      type: 'string',
      maxLength: 200,
      'x-nullable': true,
      filterable: true,
    },
    action_results: {
      title: 'Action results',
      type: 'object',
      'x-nullable': true,
    },
    error: { title: 'Error', type: 'string', 'x-nullable': true },
    started_at: {
      title: 'Started at',
      type: 'string',
      format: 'date-time',
      'x-nullable': true,
    },
    finished_at: {
      title: 'Finished at',
      type: 'string',
      format: 'date-time',
      'x-nullable': true,
    },
    created_date_time: {
      title: 'Created date time',
      type: 'string',
      format: 'date-time',
      readOnly: true,
    },
    updated_date_time: {
      title: 'Updated date time',
      type: 'string',
      format: 'date-time',
      readOnly: true,
    },
  },

  required: ['map'],
};
