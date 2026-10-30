package com.healgym.repository;

import org.springframework.stereotype.Component;

@Component
public class DietRepository extends OwnedRepository {

  public DietRepository(Db db) {
    super(db.diets(), "Diet");
  }
}
