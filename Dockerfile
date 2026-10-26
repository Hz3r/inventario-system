# =====================================================================
# Imagen para Railway (o cualquier nube con Docker).
# Construye la pagina (React), la mete dentro del jar y arranca Spring Boot.
# =====================================================================

# 1) Pagina web
FROM node:22-alpine AS frontend
WORKDIR /app/Frontend
COPY Frontend/package.json Frontend/package-lock.json ./
RUN npm ci
COPY Frontend/ ./
RUN npm run build

# 2) Backend (el pom.xml copia ../Frontend/dist dentro del jar)
FROM maven:3.9-eclipse-temurin-21 AS backend
WORKDIR /app/backend
COPY backend/pom.xml ./
RUN mvn -q -B dependency:go-offline
COPY backend/src ./src
COPY --from=frontend /app/Frontend/dist /app/Frontend/dist
RUN mvn -q -B -DskipTests package

# 3) Imagen final: solo Java + el jar
FROM eclipse-temurin:21-jre
WORKDIR /app
ENV TZ=America/Lima
COPY --from=backend /app/backend/target/inventario.jar app.jar
EXPOSE 8080
CMD ["java", "-XX:MaxRAMPercentage=75", "-jar", "app.jar"]
