export const calculateAge = (dateOfBirth) => {
  if (!dateOfBirth) return null;

  const birthDate = new Date(dateOfBirth);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDifference = today.getMonth() - birthDate.getMonth();

  if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < birthDate.getDate())) {
    age -= 1;
  }

  return age;
};

export const calculateBasalMetabolicRate = (weight, height, age, gender) => {
  if (!weight || !height || !age || !gender) return null;

  const baseRate = 10 * weight + 6.25 * height - 5 * age;
  return gender === 'masculino' ? baseRate + 5 : baseRate - 161;
};

export const calculateBodyMassIndex = (weight, height) => {
  if (!weight || !height) return null;

  const heightInMeters = height / 100;
  return weight / heightInMeters ** 2;
};
