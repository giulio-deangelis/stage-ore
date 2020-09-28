using training.hours as h from '../db/data-model';

service Hours @(impl:'hours-service') {

  entity projects as projection on h.Project { 
    *, tasks: redirected to tasks
  };
  
  entity tasks as projection on h.Task {
    *, hours: redirected to hours
  };
  
  entity hours as projection on h.Hours;
  
  function deleteProject(name: String) returns String;
}