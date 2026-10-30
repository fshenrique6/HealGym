package com.healgym.repository;

import org.springframework.stereotype.Component;

@Component
public class WorkoutRepository extends OwnedRepository {

  public WorkoutRepository(Db db) {
    super(db.workouts(), "Workout");
  }
}
