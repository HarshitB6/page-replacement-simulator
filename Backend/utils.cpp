#include "utils.hpp"

vector<int> generateRandomPages(int n, int maxPage) {
    srand((unsigned)time(nullptr));
    vector<int> pages;
    for (int i = 0; i < n; i++) {
        pages.push_back(rand() % maxPage + 1);
    }
    return pages;
}

map<int, int> simulateFIFOFrames(const vector<int>& pages, int maxFrames) {
    map<int, int> result;
    for (int f = 1; f <= maxFrames; f++) {
        Result r = fifo(pages, f);
        result[f] = r.faults;
    }
    return result;
}

map<int, int> simulateLRUFrames(const vector<int>& pages, int maxFrames) {
    map<int, int> result;
    for (int f = 1; f <= maxFrames; f++) {
        Result r = lru(pages, f);
        result[f] = r.faults;
    }
    return result;
}

map<int, int> simulateOptimalFrames(const vector<int>& pages, int maxFrames) {
    map<int, int> result;
    for (int f = 1; f <= maxFrames; f++) {
        Result r = optimal(pages, f);
        result[f] = r.faults;
    }
    return result;
}

bool detectBelady(const map<int, int>& faultsMap) {
    int prev = -1;
    for (auto& p : faultsMap) {
        if (prev != -1 && p.second > prev) {
            return true;
        }
        prev = p.second;
    }
    return false;
}
