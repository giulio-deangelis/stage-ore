namespace training.hours;

entity Project {
    key name: String(100);
    description: String(1000);
    
    tasks: Association to many Task on tasks.project = $self;
}

entity Task {
    key name: String(60);
    description: String(1000);
    
    @cascade: {delete}
    key project: Association to Project;
    
    hours: Association to many Hours on hours.task = $self;
}

entity Hours {
    key user: String(100) not null;
    key day: DateTime not null;
    key hours: Integer default 0;
    
    @cascade: {delete}
    key task: Association to Task;
}