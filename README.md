# CarePoint Clinic Frontend

A responsive React + TypeScript dashboard for the [Clinic Booking API](https://github.com/dayo777/clinic_booking_api). The UI follows the implemented API routes and payload shapes documented in the backend's `endpoints.md`.

## Run with Docker only

You only need Docker installed. Node.js, npm, and the frontend source dependencies are not required on your machine.

### Build the image from the source code

Run this command from the root of this repository:

```bash
docker build \
  --build-arg VITE_API_URL=http://localhost:8080/api \
  -t clinic-booking-frontend .
```

The API URL is embedded into the frontend during the Docker build. If the backend is hosted elsewhere, replace the value with the URL that is reachable from the user's browser, for example:

```bash
docker build \
  --build-arg VITE_API_URL=https://api.example.com/api \
  -t clinic-booking-frontend .
```

### Run the container from local build

```bash
docker run -d \
  --name clinic_booking_frontend \
  -p 3000:80 \
  clinic-booking-frontend
```

Open the frontend at [http://localhost:3000](http://localhost:3000).

### Stop and remove the container

```bash
docker stop clinic_booking_frontend
docker rm clinic_booking_frontend
```

### Pull the container from DockerHub and run a published image

Published image: [dayo777/clinic-booking-frontend on Docker Hub](https://hub.docker.com/r/dayo777/clinic-booking-frontend/tags)

```bash
docker pull dayo777/clinic-booking-frontend:main
docker run -d \
  --name clinic_booking_frontend \
  -p 3000:80 \
  dayo777/clinic-booking-frontend:main
```

Open the frontend at [http://localhost:3000](http://localhost:3000).

> **Important:** The backend must be running at the configured API URL and must allow requests from `http://localhost:3000` through CORS. Every request includes the required `x-api-version: 1` header.

## Run locally with npm

This option is only needed for frontend development. Docker users can skip it.

```bash
npm install
cp .env.example .env
npm run dev
```

The default API URL is `http://localhost:8080/api`. Change `VITE_API_URL` in `.env` when the backend is hosted elsewhere.

## Included workflows

- API connection and error state with retry
- Patient listing, search, registration, profile review, and archive
- Doctor listing, registration, activation, deactivation, and schedule management
- Appointment creation from an available doctor slot
- Appointment confirmation, cancellation, completion, no-show, and status history
- Responsive clinic dashboard and appointment summary

Appointment lists are exposed by the API per patient or doctor, so the dashboard gathers patient appointment pages to create its combined appointment view. Schedule creation uses `POST /doctor/{id}/create-doctor-schedule` with `{ start_time, minutes }` entries; schedule reads use the `/schedule` and `/active-doctor-schedule` routes. Patient cancellation requires a `canceled_by` value and is subject to the backend's 24-hour rule; the dashboard cancellation action is sent as `doctor`.
