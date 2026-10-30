FROM maven:3.9.9-eclipse-temurin-17 AS build
WORKDIR /src
COPY pom.xml .
COPY src ./src
RUN mvn -B -DskipTests package

FROM eclipse-temurin:17-jre-jammy
WORKDIR /app
COPY --from=build /src/target/healgym-backend.jar /app/healgym-backend.jar
EXPOSE 5000
ENV PORT=5000
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=75.0", "-jar", "/app/healgym-backend.jar"]
