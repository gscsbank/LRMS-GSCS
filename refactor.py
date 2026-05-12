import re

def refactor_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # checkFirestoreHealth
    content = content.replace("const testRef = db.collection(\"health_check\").doc(\"status\");\n        await testRef.set({\n            lastChecked: new Date().toISOString(),\n            status: \"OK\"\n        });", 
                              "await window.db.getDB();")

    # getAllCustomers
    content = content.replace("const snapshot = await db.collection(\"customers\").get();\n        const customers = snapshot.docs\n            .map(doc => ({ id: doc.id, ...doc.data() }))\n            .filter(c => c.isDeleted !== true && c.isDeleted !== \"true\");",
                              "const docs = await window.db.getAll(\"customers\");\n        const customers = docs.filter(c => c.isDeleted !== true && c.isDeleted !== \"true\");")

    # getCustomerByAccountNo string
    content = content.replace("let snapshot = await db.collection(\"customers\").where('accountNo', '==', cleanAcc).get();\n        if (snapshot.empty && !isNaN(cleanAcc) && cleanAcc !== \"\") {\n            snapshot = await db.collection(\"customers\").where('accountNo', '==', Number(cleanAcc)).get();\n        }\n\n        if (snapshot.empty) return null;\n        const docInfo = snapshot.docs.find(doc => !doc.data().isDeleted);\n        if (!docInfo) return null;\n        return { id: docInfo.id, ...docInfo.data() };",
                              "const docs = await window.db.getAll(\"customers\");\n        const found = docs.find(c => !c.isDeleted && ((c.accountNo || \"\").toString().trim() === cleanAcc || Number(c.accountNo) === Number(cleanAcc)));\n        return found || null;")

    # addCustomer
    content = content.replace("await db.collection(\"customers\").add(customerData);", "await window.db.add(\"customers\", customerData);")

    # addAction
    content = content.replace("await db.collection(\"actions\").add(actionData);", "await window.db.add(\"actions\", actionData);")

    # getCustomerActions
    content = content.replace("let snapshot = await db.collection(\"actions\").where('customerAccountNo', '==', cleanAcc).get();\n        if (snapshot.empty && !isNaN(cleanAcc) && cleanAcc !== \"\") {\n            snapshot = await db.collection(\"actions\").where('customerAccountNo', '==', Number(cleanAcc)).get();\n        }\n\n        let actions = snapshot.docs\n            .map(doc => ({ id: doc.id, ...doc.data() }))\n            .filter(a => !a.isDeleted);",
                              "const allActions = await window.db.getByIndex(\"actions\", \"customerAccountNo\", cleanAcc);\n        let actions = allActions.filter(a => !a.isDeleted);")

    # updateCustomerStatus
    content = content.replace("await db.collection(\"customers\").doc(customer.id).update({\n                status: newStatus,\n                statusDate: statusDate || new Date().toISOString().split('T')[0]\n            });",
                              "await window.db.update(\"customers\", customer.id, {\n                status: newStatus,\n                statusDate: statusDate || new Date().toISOString().split('T')[0]\n            });")

    # getCustomersByStatus
    content = content.replace("const snapshot = await db.collection(\"customers\").where('status', '==', status).get();\n        return snapshot.docs\n            .map(doc => ({ id: doc.id, ...doc.data() }))\n            .filter(c => c.isDeleted !== true && c.isDeleted !== \"true\");",
                              "const docs = await window.db.getAll(\"customers\");\n        return docs.filter(c => c.status === status && c.isDeleted !== true && c.isDeleted !== \"true\");")

    # updateCustomer
    content = content.replace("await db.collection(\"customers\").doc(customer.id).update(updatedData);",
                              "await window.db.update(\"customers\", customer.id, updatedData);")

    # deleteCustomer soft
    content = content.replace("await db.collection(\"customers\").doc(customer.id).update({\n                isDeleted: true,\n                deletedAt: new Date().toISOString()\n            });",
                              "await window.db.update(\"customers\", customer.id, {\n                isDeleted: true,\n                deletedAt: new Date().toISOString()\n            });")

    # deleteCustomer fallback soft
    content = content.replace("await db.collection(\"customers\").doc(found.id).update({ isDeleted: true, deletedAt: new Date().toISOString() });",
                              "await window.db.update(\"customers\", found.id, { isDeleted: true, deletedAt: new Date().toISOString() });")

    # getDeletedCustomers fallback
    content = content.replace("const snapshot = await db.collection(\"customers\").get();\n            return snapshot.docs\n                .map(doc => ({ id: doc.id, ...doc.data() }))\n                .filter(c => c.isDeleted === true || c.isDeleted === \"true\");",
                              "const docs = await window.db.getAll(\"customers\");\n            return docs.filter(c => c.isDeleted === true || c.isDeleted === \"true\");")

    # getDeletedCustomers
    content = content.replace("const snapshot = await db.collection(\"customers\").where('isDeleted', '==', true).get();\n        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));",
                              "const docs = await window.db.getAll(\"customers\");\n        return docs.filter(c => c.isDeleted === true || c.isDeleted === \"true\");")

    # restoreCustomer
    content = content.replace("const doc = await db.collection(\"customers\").doc(docId).get();\n        const data = doc.data();\n        await db.collection(\"customers\").doc(docId).update({\n            isDeleted: firebase.firestore.FieldValue.delete(),\n            deletedAt: firebase.firestore.FieldValue.delete()\n        });",
                              "const data = await window.db.get(\"customers\", docId);\n        await window.db.update(\"customers\", docId, {\n            isDeleted: null,\n            deletedAt: null\n        });")

    # permanentlyDeleteCustomer
    # The batch is completely different. I will use multi_replace for this manually.

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

refactor_file('js/app.js')
