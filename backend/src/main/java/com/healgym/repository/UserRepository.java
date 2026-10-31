package com.healgym.repository;

import com.healgym.model.User;
import com.healgym.web.CastException;
import com.mongodb.client.model.Filters;
import com.mongodb.client.model.ReplaceOptions;
import com.mongodb.client.model.Sorts;
import java.util.ArrayList;
import java.util.List;
import org.bson.Document;
import org.bson.conversions.Bson;
import org.bson.types.ObjectId;
import org.springframework.stereotype.Component;

@Component
public class UserRepository {

  private final Db db;

  public UserRepository(Db db) {
    this.db = db;
  }

  public User findById(Object id) {
    if (id == null) {
      return null;
    }
    if (!(id instanceof String) || !ObjectId.isValid((String) id)) {
      throw CastException.objectId(id, "User");
    }
    return findOne(Filters.eq("_id", new ObjectId((String) id)));
  }

  public User findById(ObjectId id) {
    return findOne(Filters.eq("_id", id));
  }

  public User findOne(Bson filter) {
    return User.fromDocument(db.users().find(filter).first());
  }

  public List<User> find(Bson filter, int skip, int limit) {
    List<User> users = new ArrayList<>();
    for (Document document :
        db.users().find(filter).sort(Sorts.descending("createdAt")).skip(skip).limit(limit)) {
      users.add(User.fromDocument(document));
    }
    return users;
  }

  public long count(Bson filter) {
    return db.users().countDocuments(filter);
  }

  public long count() {
    return db.users().countDocuments();
  }

  public void save(User user, boolean validate) {
    user.prepareForSave(validate);
    db.users()
        .replaceOne(
            Filters.eq("_id", user.getId()), user.toDocument(), new ReplaceOptions().upsert(true));
  }

  public void deleteById(ObjectId id) {
    db.bodyMeasurements().deleteMany(Filters.eq("user", id));
    db.users().deleteOne(Filters.eq("_id", id));
  }
}
