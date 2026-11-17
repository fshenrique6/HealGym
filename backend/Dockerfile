FROM maven:3.9.9-eclipse-temurin-17 AS build
WORKDIR /src
COPY pom.xml .
COPY src ./src
RUN --mount=type=cache,target=/root/.m2 mvn -B -ntp -DskipTests package

FROM eclipse-temurin:17-jre-jammy
RUN groupadd --system --gid 1001 app \
    && useradd --system --uid 1001 --gid app --no-create-home --shell /usr/sbin/nologin app
WORKDIR /app
COPY --from=build --chown=app:app /src/target/healgym-backend.jar /app/healgym-backend.jar
USER app
EXPOSE 5000
ENV PORT=5000
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=75.0", "-jar", "/app/healgym-backend.jar"]
