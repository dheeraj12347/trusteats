# TrustEats

TrustEats is a food-ordering and complaint-verification platform focused on improving trust in post-delivery issue reporting. It combines restaurant/customer workflows with backend complaint processing, image-based evidence verification hooks, and structured decision logic for handling food-related complaint cases.

## Features

- Multi-restaurant backend workflow
- Role-based authentication for customers and restaurants
- Order management APIs
- Complaint submission flow
- Complaint evidence verification pipeline
- Image upload validation and complaint media handling
- Complaint decision service with structured status mapping
- Verifier contract documentation for backend integration
- Automated backend tests for complaint and restaurant auth flows

## Project structure

```text
TRUSTEATS/
├── backend/
│   ├── src/
│   │   ├── ai/
│   │   │   └── verify_image.py
│   │   ├── config/
│   │   │   └── seed_restaurants.js
│   │   ├── controllers/
│   │   │   ├── auth.controller.js
│   │   │   ├── complaint.controller.js
│   │   │   └── order.controller.js
│   │   ├── middleware/
│   │   │   └── auth.middleware.js
│   │   ├── models/
│   │   │   ├── order.model.js
│   │   │   └── user.model.js
│   │   ├── services/
│   │   │   ├── complaintAi.service.js
│   │   │   └── complaintDecision.service.js
│   │   ├── utils/
│   │   │   └── uploader.js
│   │   ├── app.js
│   │   └── server.js
│   ├── tests/
│   │   ├── complaint.test.js
│   │   ├── restaurantAuth.test.js
│   │   └── fixtures/
│   ├── VERIFIER_CONTRACT.md
│   └── package.json
└── frontend/
```

## Core workflows

### 1. Authentication
TrustEats supports role-based authentication so that customers and restaurants can access only their intended flows.

### 2. Orders
Customers place orders, while restaurant-side flows manage and update order-related actions.

### 3. Complaints
Customers can raise complaints against delivered orders, attaching complaint details and supporting media where applicable.

### 4. Evidence verification
The backend includes an image verification pipeline that supports complaint evidence analysis and structured decision-making.

### 5. Complaint decisioning
Complaint data, uploaded evidence, and verification outputs are processed through backend services to determine decision outcomes and status mappings.

## Tech stack

### Backend
- Node.js
- Express.js
- JavaScript
- Python (for image verification logic)
- Multipart upload handling
- Automated test coverage for backend flows

### Testing
- Complaint flow tests
- Restaurant authentication tests

## Getting started

### 1. Clone the repository

```bash
git clone https://github.com/dheeraj12347/trusteats.git
cd trusteats
```

### 2. Install backend dependencies

```bash
cd backend
npm install
```

### 3. Configure environment variables

Create a `.env` file inside `backend/` and add the required configuration values for your local setup.

Example:

```env
PORT=5000
JWT_SECRET=your_jwt_secret
DB_HOST=localhost
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=trusteats
```

Update the values based on your local database and backend configuration.

### 4. Run the backend

```bash
npm start
```

Or, if your project uses a dev script:

```bash
npm run dev
```

### 5. Seed restaurant data

If needed, run the restaurant seed script from the backend setup flow:

```bash
node src/config/seed_restaurants.js
```

## Testing

Run backend tests with:

```bash
npm test
```

If you want to run specific tests only, use the test runner syntax defined in your backend setup.

## Documentation

Additional backend documentation is available in:

```text
backend/VERIFIER_CONTRACT.md
```

This file is intended to describe the verifier interface/contract and how the complaint evidence verification pipeline integrates with the backend.

## Important notes

- Do not commit local upload artifacts from `backend/uploads/`
- Keep secrets and environment variables out of version control
- Add proper `.gitignore` rules for uploads, generated files, and `.env`
- Review verifier-related outputs carefully before using them for automated moderation decisions

## Roadmap

- Improve complaint evidence verification accuracy
- Expand complaint decision explainability
- Strengthen multi-restaurant authorization flows
- Add richer frontend integration for complaint and order tracking
- Improve test coverage across edge cases and verification outcomes

## Contributing

Contributions, suggestions, and improvements are welcome. Please open an issue or submit a pull request for proposed changes.

## License

MIT License :)
