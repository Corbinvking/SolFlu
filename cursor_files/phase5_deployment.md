Here’s the **`phase5-deployment.md`** file:

---

```markdown
# Phase 5: Deployment

## Objective
The goal of this phase is to deploy the simulation system, including the backend and frontend, on hosting platforms to make the MVP publicly accessible. This involves ensuring reliable hosting, securing the system, and validating performance under real-world conditions.

---

## Steps to Completion

### **1. Backend Deployment**

#### **1.1 Prepare the Backend for Deployment**
1. **Dockerize the Backend**:
   - Create a `Dockerfile` for containerizing the backend:
     ```dockerfile
     FROM python:3.9-slim

     WORKDIR /app

     COPY requirements.txt requirements.txt
     RUN pip install -r requirements.txt

     COPY . .

     CMD ["python", "app.py"]
     ```

   - Build and test the Docker container:
     ```bash
     docker build -t simulation-backend .
     docker run -p 5000:5000 simulation-backend
     ```

2. **Environment Variables**:
   - Add environment variables for API keys (e.g., CoinGecko, Binance) and configuration settings:
     ```bash
     export COINGECKO_API_KEY=<your-api-key>
     export BINANCE_API_KEY=<your-api-key>
     ```

#### **1.2 Deploy to Hosting Platform**
1. **Option 1: AWS EC2**:
   - Launch an EC2 instance and install Docker:
     ```bash
     sudo apt update
     sudo apt install docker.io
     ```

   - Transfer the Docker image to the instance and run the container:
     ```bash
     docker run -d -p 5000:5000 simulation-backend
     ```

2. **Option 2: Heroku**:
   - Install the Heroku CLI and initialize the project:
     ```bash
     heroku login
     heroku create simulation-backend
     ```

   - Push the project to Heroku:
     ```bash
     git add .
     git commit -m "Prepare for deployment"
     git push heroku main
     ```

3. **Verify the Backend**:
   - Ensure the `/simulation` endpoint and WebSocket connections are accessible via the hosting platform’s public URL.

---

### **2. Frontend Deployment**

#### **2.1 Prepare the Frontend for Deployment**
1. **Optimize Build**:
   - Build the production version of the React app:
     ```bash
     npm run build
     ```

2. **Environment Variables**:
   - Set the backend URL as an environment variable:
     ```bash
     REACT_APP_BACKEND_URL=<backend-public-url>
     ```

#### **2.2 Deploy to Hosting Platform**
1. **Option 1: Vercel**:
   - Link the GitHub repository containing the frontend code to Vercel.
   - Deploy the project by configuring the environment variable for the backend URL.

2. **Option 2: Netlify**:
   - Drag and drop the `build` folder into the Netlify dashboard.
   - Configure the backend URL in Netlify's environment settings.

3. **Verify the Frontend**:
   - Open the deployed URL and confirm the map renders dynamically with real-time updates.

---

### **3. Configure Domain and SSL**

#### **3.1 Domain Configuration**
- Use **Cloudflare** to manage DNS records:
  1. Add an `A` record pointing to the backend IP address (for AWS EC2) or configure CNAME for other hosting platforms.
  2. Add a `CNAME` record pointing to the frontend hosting platform’s domain.

#### **3.2 Enable SSL**
- Use **Let’s Encrypt** or Cloudflare’s free SSL to secure the site:
  - For Cloudflare, enable "Always Use HTTPS" in the SSL/TLS settings.

---

### **4. Performance Testing**

#### **4.1 Backend Load Testing**
- Use tools like **Apache JMeter** or **Locust** to simulate high API request loads and WebSocket connections.

#### **4.2 Frontend Stress Testing**
- Test how the map handles frequent updates and large datasets.
- Verify responsiveness on different devices (desktop, tablet, mobile).

#### **4.3 End-to-End Testing**
- Perform a full integration test:
  - Fetch data from the backend.
  - Update the map in real-time.
  - Validate UI interactivity (e.g., clicking on countries).

---

### **5. Monitoring and Maintenance**

#### **5.1 Set Up Monitoring**
1. Use **AWS CloudWatch** or **New Relic** to monitor backend performance (CPU, memory, API latency).
2. Integrate **Google Analytics** or **Mixpanel** to track user interactions on the frontend.

#### **5.2 Error Reporting**
- Add **Sentry** to track and report errors for both backend and frontend:
  - Backend:
    ```bash
    pip install sentry-sdk
    ```
  - Frontend:
    ```bash
    npm install @sentry/react @sentry/tracing
    ```

#### **5.3 Backup and Updates**
- Schedule regular database and server backups.
- Plan for periodic updates to add new features or optimize performance.

---

## Deliverables
1. **Live Simulation System**:
   - Backend hosted and accessible via public URL.
   - Frontend deployed and accessible via a custom domain.

2. **Secure Deployment**:
   - SSL-enabled frontend and backend.
   - Monitoring and error tracking configured.

3. **Performance Validation**:
   - Verified system handles real-time updates and user interactions efficiently.

---

## Next Steps
With the MVP deployed:
- Begin gathering feedback and usage data to prioritize future enhancements.
- Reference the **`future-expansions.md`** file for planned features and scalability goals.
```

---
