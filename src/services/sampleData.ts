export const SAMPLE_PROJECT_JSON = {
    "tenant": "demo-us",
    "tenantType": "tenant",
    "projectId": "e5360285-afa1-424b-9e30-0a8e1d6673c7",
    "externalIds": null,
    "projectType": "US Residential Installation V2",
    "status": "QUOTE APPROVED",
    "delegationChain": "demo-us",
    "delegationChainArray": [
        "demo-us"
    ],
    "delegationLog": null,
    "currentStatus": {
        "status": "QUOTE APPROVED",
        "previousStatus": "QUOTE SENT",
        "updatedOn": "2025-11-17T19:55:05.000Z",
        "log": [
            {
                "status": "CREATED",
                "updatedOn": "2025-11-17T19:52:14.000Z"
            },
            {
                "status": "IN REVIEW",
                "previousStatus": "CREATED",
                "updatedOn": "2025-11-17T19:53:15.000Z"
            },
            {
                "status": "QUOTE SENT",
                "previousStatus": "IN REVIEW",
                "updatedOn": "2025-11-17T19:54:32.000Z"
            }
        ]
    },
    "jobs": [
        {
            "id": "52db823b-aa85-4b20-a1d6-825e901772e3",
            "type": "US Residential Installation V2",
            "category": "Installation",
            "marketType": "Domestic",
            "scheduledDate": "",
            "assignedToDisplayName": "",
            "installer": "Jumptech US Demo",
            "installerEmail": "noreply@jumptech.co.uk",
            "abortedOn": null,
            "startedOn": null,
            "completedOn": null,
            "status": "CREATED",
            "jobAssignments": []
        },
        {
            "id": "d01707a1-d1aa-4072-9616-0e9b9042ee78",
            "type": "US Residential Installation Site Survey V2",
            "category": "Survey",
            "marketType": "Domestic",
            "scheduledDate": "",
            "assignedToDisplayName": "",
            "installer": "Jumptech US Demo",
            "installerEmail": "noreply@jumptech.co.uk",
            "abortedOn": null,
            "startedOn": null,
            "completedOn": null,
            "status": "CREATED",
            "jobAssignments": []
        },
        {
            "id": "d73e4a5e-39c8-4172-9298-a892e09c4a11",
            "type": "US Residential Installation Site Inspection V2",
            "category": "Survey",
            "marketType": "Domestic",
            "scheduledDate": "",
            "assignedToDisplayName": "",
            "installer": "Jumptech US Demo",
            "installerEmail": "noreply@jumptech.co.uk",
            "abortedOn": null,
            "startedOn": null,
            "completedOn": null,
            "status": "CREATED",
            "jobAssignments": []
        },
        {
            "id": "e853e12c-80a0-4b1c-9207-8f35074d36e9",
            "type": "Residential Site Inspection - Service Call",
            "category": "Survey",
            "marketType": "Domestic",
            "scheduledDate": "",
            "assignedToDisplayName": "",
            "installer": "Jumptech US Demo",
            "installerEmail": "noreply@jumptech.co.uk",
            "abortedOn": null,
            "startedOn": null,
            "completedOn": null,
            "status": "CREATED",
            "jobAssignments": []
        }
    ],
    "data": {
        "address": {
            "country": "United States",
            "town": "Pampa",
            "countryCode": "us",
            "latitude": 35.5386343,
            "county": "Texas",
            "postCode": "79065",
            "line1": "637 North Wells Street",
            "longitude": -100.9777953
        },
        "chargePointUnitPrice": "200",
        "email": "monique.vargas@jumptech.eco",
        "firstName": "Monique",
        "installChargePoint": "EO Mini Pro 3 - 7.2kW/32a - PME - DCL - Tethered T2 (EM301-T2T-PME-DCL)",
        "installationEquipmentCosts": [
            {
                "type": "number",
                "value": "222",
                "key": "90500UK"
            },
            {
                "type": "number",
                "value": "344",
                "key": "Admin & registration"
            }
        ],
        "installationLatLng": "35.5386343,-100.9777953",
        "lastName": "Vargas",
        "otherEligibleCosts": [
            {
                "value": "22",
                "key": "Permit Fee"
            },
            {
                "value": "320",
                "key": "Painting and striping"
            }
        ],
        "phoneNumber": "+14323108884",
        "poOrderNumber": "12345",
        "projectType": "US Residential Installation V2",
        "quoteAcceptReject": "Accepted",
        "quoteAcceptedDate": "2025-11-17T19:55:05.689Z",
        "quoteExpiryDate": "2025-11-28",
        "quoteRef": 1763409195,
        "quoteSentDate": "2025-11-17T19:54:31.057Z",
        "relayLastProgress": {
            "cardLabel": "Quote Summary",
            "progressDate": "2025-11-17T19:55:01.961Z",
            "progress": "50|1/2",
            "suid": "a636d82e-7b78-4fdd-b9e0-9c64106346ac",
            "isForm": false,
            "projectId": null,
            "tenant": "demo-us"
        },
        "state": "IL",
        "subTenants": null
    },
    "resources": {
        "QuoteSummary": {
            "installChargePoint": "EO Mini Pro 3 - 7.2kW/32a - PME - DCL - Tethered T2 (EM301-T2T-PME-DCL)",
            "installLabour": "0.00",
            "otherInstallationCosts": "908.00",
            "totalInstallationCost": "1329.60",
            "type": "QuoteSummary",
            "installationOtherEligible": null,
            "customerInstallPrice": "1108.00",
            "installationEquipment": null,
            "otherEligibleCosts": [
                {
                    "value": "22",
                    "key": "Permit Fee"
                },
                {
                    "value": "320",
                    "key": "Painting and striping"
                }
            ],
            "installCablingSwitchgearConsumables": "566.00",
            "customerInstallVat": "221.60",
            "installationEquipmentCosts": [
                {
                    "type": "number",
                    "value": "222",
                    "key": "90500UK"
                },
                {
                    "type": "number",
                    "value": "344",
                    "key": "Admin & registration"
                }
            ],
            "installHardware": "200.00",
            "totalInstallationVat": "221.60",
            "installAdminMobilisation": "342.00",
            "installOlevGrant": "0.00",
            "installEstimatedHours": 0,
            "customerInstallTotal": "1329.60"
        },
        "Quote": {
            "total": 1329.6,
            "notes": [],
            "grossTotal": 1329.6,
            "vatTotal": 221.6,
            "vatRate": 0.2,
            "netTotal": 1108,
            "items": [
                {
                    "total": 240,
                    "quantity": 1,
                    "rate": 200,
                    "grossTotal": 240,
                    "vatTotal": 40,
                    "vatRate": 0.2,
                    "description": "EO Mini Pro 3 - 7.2kW/32a - PME - DCL - Tethered T2 (EM301-T2T-PME-DCL)",
                    "netTotal": 200,
                    "items": [],
                    "key": "installHardware"
                },
                {
                    "total": 679.2,
                    "quantity": 2,
                    "rate": 0,
                    "grossTotal": 679.2,
                    "vatTotal": 113.2,
                    "vatRate": 0.2,
                    "description": "Consumables",
                    "netTotal": 566,
                    "items": [
                        {
                            "total": 266.4,
                            "quantity": 1,
                            "rate": 222,
                            "grossTotal": 266.4,
                            "vatTotal": 44.4,
                            "vatRate": 0.2,
                            "description": "90500UK",
                            "netTotal": 222,
                            "items": [],
                            "key": "installCablingSwitchgearConsumables_0"
                        },
                        {
                            "total": 412.8,
                            "quantity": 1,
                            "rate": 344,
                            "grossTotal": 412.8,
                            "vatTotal": 68.8,
                            "vatRate": 0.2,
                            "description": "Admin & registration",
                            "netTotal": 344,
                            "items": [],
                            "key": "installCablingSwitchgearConsumables_1"
                        }
                    ],
                    "key": "installCablingSwitchgearConsumables"
                },
                {
                    "total": 410.4,
                    "quantity": 2,
                    "rate": 0,
                    "grossTotal": 410.4,
                    "vatTotal": 68.4,
                    "vatRate": 0.2,
                    "description": "Admin Mobilisation",
                    "netTotal": 342,
                    "items": [
                        {
                            "total": 26.4,
                            "quantity": 1,
                            "rate": 22,
                            "grossTotal": 26.4,
                            "vatTotal": 4.4,
                            "vatRate": 0.2,
                            "description": "Permit Fee",
                            "netTotal": 22,
                            "items": [],
                            "key": "installAdminMobilisation_0"
                        },
                        {
                            "total": 384,
                            "quantity": 1,
                            "rate": 320,
                            "grossTotal": 384,
                            "vatTotal": 64,
                            "vatRate": 0.2,
                            "description": "Painting and striping",
                            "netTotal": 320,
                            "items": [],
                            "key": "installAdminMobilisation_1"
                        }
                    ],
                    "key": "installAdminMobilisation"
                }
            ]
        },
        "Atom_Annex_D": {
            "assigned_to_team": "55c51cd1-dc60-47d5-a699-af0bd5f8fb8e",
            "assigned_to_team_name": "55c51cd1-dc60-47d5-a699-af0bd5f8fb8e",
            "created_by": "15e50586-5adf-444e-a2c4-6c8397831cdf",
            "created_by_name": "Monique Vargas",
            "created_by_team": "55c51cd1-dc60-47d5-a699-af0bd5f8fb8e",
            "created_by_team_name": "Account Managers",
            "created_on": "2025-11-17T19:52:14.562Z",
            "delegationChain": "demo-us",
            "documentPackId": "dp_667bca24-a6db-487b-b9ef-8cb9de2fc940",
            "id": "e5360285-afa1-424b-9e30-0a8e1d6673c7",
            "marketType": "Domestic",
            "primaryOwner": "demo-us",
            "tenant": "demo-us",
            "type": "US Residential Installation V2",
            "updated_on": "2025-11-17T19:53:15.329Z",
            "installer": "Jumptech US Demo",
            "installerEvhs": null,
            "olevRemainingCostContribution": "Jumptech US Demo",
            "firstName": "Monique",
            "lastName": "Vargas",
            "phoneNumber": "+14323108884",
            "email": "monique.vargas@jumptech.eco",
            "makeModel": null,
            "vrn": null,
            "vehicleDeliveryDate": null,
            "vehicleOrderRef": null,
            "customerInstallationDetailsSignatureDate": null,
            "eligible1": "Yes",
            "eligible2": "Yes",
            "eligible3": "Yes",
            "eligible5": "Yes",
            "previousVrn": null,
            "eligible8": "Yes",
            "eligible9": "Yes",
            "installPermission": "Yes",
            "associatedElecCosts": "Yes",
            "installChargePointMake": "eo",
            "installChargePoint": "EM301-T2T-PME-DCL",
            "installerAccreditationBody": "NICEIC",
            "installedAppropriately": null,
            "chargePointId": null,
            "projectInstallationDate": null,
            "chargePointUnitPrice": "200.00",
            "chargePointUnitPriceIncVat": "240.00",
            "installCablingSwitchgearConsumables": "566.00",
            "installCablingSwitchgearConsumablesIncVat": "679.20",
            "installCablingSwitchgearConsumablesByItem": "<div>£222.00</div><div>£344.00</div>",
            "installCablingSwitchgearConsumablesByItemIncVat": "<div>£266.40</div><div>£412.80</div>",
            "installAdminMobilisation": "342.00",
            "installAdminMobilisationByItem": "<div>£22</div><div>£320</div>",
            "installAdminMobilisationByItemIncVat": "<div>£26.40</div><div>£384.00</div>",
            "installAdminMobilisationIncVat": "410.40",
            "totalEquipmentCostIncVat": "1329.60",
            "installTotal": "1329.60",
            "installVat": "221.60",
            "installPrice": "1108.00",
            "hourlyLabourRate": "0.00",
            "totalLabourCost": "0.00",
            "totalLabourCostIncVat": "0.00",
            "hoursOfLabour": "NaN",
            "evhsGrantValue": "0.00",
            "customerInstallPrice": "1108.00",
            "customerInstallVat": "221.60",
            "customerInstallTotal": "1329.60",
            "contributionSource1": null,
            "contributionSource1Amnt": null,
            "contributionSource1Pct": "-",
            "installationEquipment": "<div>1. 90500UK</div><div>2. Admin & registration</div>",
            "installationOtherEligible": "<div>1. Permit Fee</div><div>2. Painting and striping</div>"
        },
        "DnoDemandSummary": {
            "installChargePoint": "EO Mini Pro 3 - 7.2kW/32a - PME - DCL - Tethered T2 (EM301-T2T-PME-DCL)",
            "mpan": null,
            "address": {
                "country": "United States",
                "town": "Pampa",
                "countryCode": "us",
                "latitude": 35.5386343,
                "county": "Texas",
                "postCode": "79065",
                "line1": "637 North Wells Street",
                "longitude": -100.9777953
            },
            "dnoNotificationEmail": "dev@jumptech.co.uk",
            "proceed": "DNO Guidance required or Load Managed EVSE",
            "proposedEarthingArrangements": "TT (Direct)",
            "dno": "Unknown",
            "maximumDemand": "0A",
            "newInstallationDetails": "32A",
            "suggestLoadManageChargeStation": "No",
            "newInstallationDemand": "32A",
            "isThreePhase": false,
            "dnoApplicationRequiredInAdvance": "No",
            "earthingArrangement": "TT (Single Phase)",
            "dnoApplicationEmail": "dev@jumptech.co.uk",
            "dnoId": "Unknown",
            "considerLoadMonitoring": "No",
            "postCode": "79065",
            "cutOutRating": "Unknown",
            "additionalNotes": null,
            "phases": "Single Phase",
            "installChargePointDetails": {
                "model": "EO Mini Pro 3 Tethered T2",
                "manufacturer": "eo"
            }
        }
    },
    "primaryOwner": "demo-us",
    "owner_name": null,
    "lastAssignment": null
};
