#ifndef UTILS_HPP
#define UTILS_HPP

#include <bits/stdc++.h>
using namespace std;

struct Step {
    vector<int> frames;
    int page;
    bool hit;
    int replaced;
    string reason; // explains WHY this page was replaced
};

struct Result {
    string algorithm;
    vector<Step> steps;
    int faults;
    int hits;
    double hitRatio;
    double faultRatio;
};

// algorithms
Result fifo(const vector<int>&, int);
Result lru(const vector<int>&, int);
Result optimal(const vector<int>&, int);
Result lfu(const vector<int>&, int);

// advanced
vector<int> generateRandomPages(int, int);
map<int, int> simulateFIFOFrames(const vector<int>&, int);
map<int, int> simulateLRUFrames(const vector<int>&, int);
map<int, int> simulateOptimalFrames(const vector<int>&, int);
bool detectBelady(const map<int, int>&);

#endif
