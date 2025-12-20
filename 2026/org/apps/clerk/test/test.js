import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore';
import { ReadableStream } from "web-streams-polyfill/ponyfill";


const assert = require('assert') ;
const firebase = require('@firebase/rules-unit-testing') ;
const PROJECT_ID = "clerk-test-project" ;
const db = firebase.initializeTestApp({ projectId: PROJECT_ID, auth: { uid: "testUser" } }).firestore() ;

function getMortgages(date) {
  const mtgRef = db.collection("Mortgages") ;
  const mq = query(mtgRef, where("balDate", ">", date)) ;
  return getDocs(mq) ;
}

describe("Clerk Get Mortgages", () => {
  getMortgages("2023-01-01").then((snapshot) => {
    snapshot.forEach((doc) => {
      console.log(doc.id, " => ", doc.data()) ;
    }) ;
  }).catch((error) => {
    console.error("Error getting documents: ", error) ;
  })
}) ;