# Platform Update for Go-Live — Changelog & Summary of Changes

This document provides a formal, comprehensive summary of the changes and new features implemented to optimize the platform for production.

---

## 1. Dashboard (`Dashboard.jsx` & `ResultsPage.jsx`)
The dashboard has been optimized to improve security, ease of navigation, and details shown in the data tables.
*   **Role-Based Tab Visibility:** The dashboard navigation tabs are now dynamically filtered based on the logged-in user's role:
    *   **Pre-Policy Access** users can only see the *Pre-Policy* tab.
    *   **Claims Access** users can only see the *Motor Claim* and *Wind Shield Claim* tabs.
    *   **Supervisors** can view all tabs.
*   **User Access Control Navigation:** A new "User Access Control" tab has been added to the main navigation bar. This tab is exclusively visible to `supervisor` and `supervisor_admin` roles to let them manage staff permissions.
*   **Enhanced Filtering Options:**
    *   Added a **Creator Type** filter dropdown to filter inspections based on the type of user who created them (e.g. Pre-Policy vs. Claims).
    *   Enhanced the **Review Status** filter to support granular statuses including *Accepted*, *Rejected*, *Pending*, and *Viewed*.
*   **Table Data Columns:**
    *   Added a **Location** column showing the coordinates of the device during the inspection.
    *   Added a **Created By** column indicating the name of the user who initiated the inspection link.
    *   Added a **Fake Image Detection** column to flag if a mock or non-genuine image was uploaded.
    *   Added dynamic **Serial Numbers** for improved row identification.
*   **View-Status Tracking:** When an inspection details row is clicked to open the assessment details, it now automatically sends an API request to mark the inspection status as "Viewed".
*   **Prevent Accidental Logouts:** A browser back button interceptor has been added. If a user presses the browser back button, they are prompted with a logout confirmation modal instead of being abruptly logged out.

---

## 2. User Access Control (`UserAccessControl.jsx` & APIs)
A complete User Access Control system has been developed and integrated with the backend.
*   **User Management Modals:** Supervisors can now dynamically **Add**, **Edit**, and **Delete** sub-users directly from the dashboard.
*   **Granular Permission Allocation:** When creating or editing sub-users, supervisors can assign specific access scopes:
    *   *Pre-Policy Broad Access*
    *   *Pre-Policy Limited Access*
    *   *Claims Broad Access*
    *   *Claims Limited Access*
*   **Usage Performance Metrics:** Added a statistics card section displaying the performance metrics for supervisors and sub-users. This tracks:
    *   Total Links Sent
    *   Total Clicks (Links Opened by Clients)
    *   Total Opens (Camera Access Granted)
    *   Not Clicked Links
    These metrics can be filtered dynamically by month and year.

---

## 3. User Side Links Sent (`Sendlink_modal.jsx`)
The process of sending inspection links has been restricted and customized for better workflow security.
*   **Restricted Inspection Types:** The types of inspection links a user can send are now filtered by their role:
    *   **Pre-Policy Access** users can only send *Vehicle Inspection* links.
    *   **Claims Access** users can only send *Motor Claim* and *Wind Shield Claim* links.
    *   **Supervisors** can send all types.
*   **Automatic Defaults:** The modal dynamically detects the logged-in user's role and automatically sets the default selected inspection link type to match their department.

---

## 4. Geolocation Fallback and Camera Stream (`cameraStream.js`)
We resolved critical location failures and timeouts on mobile browsers:
*   **Dual-Layer Fallback Mechanism:** Geolocation querying now starts by requesting location coordinates with high accuracy and a 5-minute cache (`maximumAge: 300000`).
*   **Low-Accuracy Fallback:** If the high-accuracy request times out (common on mobile devices when GPS is booting up or indoors), the system immediately falls back to low-accuracy triangulation (Wi-Fi/cell tower/IP) with a longer timeout and 10-minute cache (`maximumAge: 600000`). This ensures the location is captured successfully and instantly on mobile phones.
*   **Automatic Upload Integration:** The captured location coordinates are saved to the local storage and attached to the data submissions during the inspection.

---

## 5. Vehicle Side Capture & WS Verification (`VehicleSideCapture.jsx` & `useVehicleSideWS.js`)
We refactored the image verification checks and popup warnings:
*   **Precise Validation Logic:**
    *   If a **fake image** is detected, it triggers the **Fake Image Detected** popup.
    *   If the image is genuine but the **expected side does not match** the received side, it triggers the **Side Not Detected** popup.
    *   If the image is genuine and matches the expected side, it proceeds successfully.
*   **Retake Support:** Supported individual side-capture retakes during inspection.
