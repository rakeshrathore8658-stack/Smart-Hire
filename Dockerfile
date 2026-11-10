# ========================================================
# SmartHire Backend Dockerfile for Render Deployment
# Runtime: Eclipse Temurin Java 25
# ========================================================

# Step 1: Build the Application
FROM eclipse-temurin:25-jdk AS build
WORKDIR /app

# Copy Maven wrapper & POM to leverage Docker caching
COPY pom.xml mvnw mvnw.cmd ./
COPY .mvn .mvn

# Normalize line endings and permissions for Linux container
RUN tr -d '\r' < mvnw > mvnw_unix && mv mvnw_unix mvnw && chmod +x mvnw

# Download dependencies
RUN ./mvnw dependency:go-offline -B || true

# Copy source code and build executable jar
COPY src ./src
RUN ./mvnw clean package -DskipTests

# Step 2: Create Lightweight Production Image
FROM eclipse-temurin:25-jre
WORKDIR /app

# Copy built jar from build stage
COPY --from=build /app/target/*.jar app.jar

# Render supplies $PORT at runtime (defaults to 8080)
ENV PORT=8080
EXPOSE 8080

# Run Spring Boot application
ENTRYPOINT ["sh", "-c", "java -Djava.security.egd=file:/dev/./urandom -Dserver.port=${PORT:-8080} -jar app.jar"]
