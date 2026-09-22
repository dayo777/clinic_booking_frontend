# CarePoint Clinic Frontend

A responsive React + TypeScript dashboard for the [Clinic Booking API](https://github.com/dayo777/clinic_booking_api). It provides a practical UI for the implemented patient, doctor, schedule, and appointment endpoints.

## Run with Docker only

You only need Docker installed. Node.js, npm, and the frontend source dependencies are not required on your machine.

### Build the image

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

### Run the container

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

### Pull and run a published image

If an image has been published to a container registry, you can run it without cloning this repository or building locally:

```bash
docker pull YOUR_REGISTRY/clinic-booking-frontend:latest
docker run -d \
  --name clinic_booking_frontend \
  -p 3000:80 \
  YOUR_REGISTRY/clinic-booking-frontend:latest
```

Replace `YOUR_REGISTRY/clinic-booking-frontend:latest` with the actual published image name.

> **Important:** The backend must be running at the configured API URL and must allow requests from `http://localhost:3000` through CORS. The frontend automatically sends the required `x-api-version: 1` header.

## Run locally with npm

This option is only needed for frontend development. Docker users can skip it.

```bash
npm install
cp .env.example .env
npm run dev
```

The default API URL is `http://localhost:8080/api`. Change `VITE_API_URL` in `.env` when the backend is hosted elsewhere. The client automatically sends the required `x-api-version: 1` header.

## Included workflows

- API health/error state with retry
- Patient listing, search, registration, and archive
- Doctor listing and registration
- Appointment listing with confirm/cancel actions
- Responsive dashboard with operational summary

The backend currently exposes appointment lists by patient/doctor, so the dashboard loads appointments for the first five patients returned by the API. CORS must be enabled by the backend when the frontend and API run on different origins.

## Backend route note

The frontend uses the implemented schedule route `/doctor/{id}/create-doctor-schedule`, which differs from the older `endpoints.md` example.
