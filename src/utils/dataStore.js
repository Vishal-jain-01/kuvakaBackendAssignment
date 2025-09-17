/**
 * In-memory data store for the lead scoring application
 * In a production environment, this would be replaced with a proper database
 */

class DataStore {
  constructor() {
    this.offers = new Map();
    this.leads = new Map();
    this.results = new Map();
    this.currentOfferId = null;
    this.currentLeadsId = null;
  }

  // Offer management
  setOffer(offerData) {
    const offerId = Date.now().toString();
    const offer = {
      id: offerId,
      ...offerData,
      createdAt: new Date().toISOString()
    };
    this.offers.set(offerId, offer);
    this.currentOfferId = offerId;
    return offer;
  }

  getCurrentOffer() {
    if (!this.currentOfferId) return null;
    return this.offers.get(this.currentOfferId);
  }

  getOffer(offerId) {
    return this.offers.get(offerId);
  }

  // Leads management
  setLeads(leadsData) {
    const leadsId = Date.now().toString();
    const leads = {
      id: leadsId,
      data: leadsData,
      uploadedAt: new Date().toISOString(),
      count: leadsData.length
    };
    this.leads.set(leadsId, leads);
    this.currentLeadsId = leadsId;
    return leads;
  }

  getCurrentLeads() {
    if (!this.currentLeadsId) return null;
    return this.leads.get(this.currentLeadsId);
  }

  getLeads(leadsId) {
    return this.leads.get(leadsId);
  }

  // Results management
  setResults(resultsData) {
    const resultsId = Date.now().toString();
    const results = {
      id: resultsId,
      data: resultsData,
      offerId: this.currentOfferId,
      leadsId: this.currentLeadsId,
      scoredAt: new Date().toISOString(),
      count: resultsData.length
    };
    this.results.set(resultsId, results);
    return results;
  }

  getLatestResults() {
    const resultsArray = Array.from(this.results.values());
    if (resultsArray.length === 0) return null;
    
    // Return the most recent results
    return resultsArray.reduce((latest, current) => 
      new Date(current.scoredAt) > new Date(latest.scoredAt) ? current : latest
    );
  }

  getResults(resultsId) {
    return this.results.get(resultsId);
  }

  // Clear data methods
  clearOffers() {
    this.offers.clear();
    this.currentOfferId = null;
  }

  clearLeads() {
    this.leads.clear();
    this.currentLeadsId = null;
  }

  clearResults() {
    this.results.clear();
  }

  clearAll() {
    this.clearOffers();
    this.clearLeads();
    this.clearResults();
  }

  // Status methods
  getStatus() {
    return {
      offers: this.offers.size,
      leads: this.leads.size,
      results: this.results.size,
      hasCurrentOffer: !!this.currentOfferId,
      hasCurrentLeads: !!this.currentLeadsId,
      ready: !!this.currentOfferId && !!this.currentLeadsId
    };
  }
}

// Export a singleton instance
const dataStore = new DataStore();
module.exports = dataStore;