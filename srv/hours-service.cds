using training.hours as h from '../db/data-model';

@path: '/'
service Hours @(impl:'hours-service') {

  entity projects @(restrict: [
    {grant: ['READ', 'WRITE'], to: 'admin'},
    {grant: ['READ'], to: 'user'}
  ]) as projection on h.Project { 
    *, tasks: redirected to tasks
  };
  
  entity tasks @(restrict: [
    {grant: ['READ', 'WRITE'], to: 'admin'},
    {grant: ['READ'], to: 'user'}
  ]) as projection on h.Task {
    *, hours: redirected to hours
  };
  
  entity hours @(restrict: [{
    grant: ['READ', 'WRITE'],
    to: ['admin', 'user'],
    where: '$user = user'
  }]) as projection on h.Hours;
  
  function user() returns String;
  function env(var: String) returns String;
}