#include "utils.hpp"

Result lru(const vector<int>& pages, int capacity) {
    vector<int> frames;
    unordered_map<int, int> lastUsed;

    Result res;
    res.algorithm = "LRU";
    res.faults = 0;
    res.hits = 0;

    for (int i = 0; i < (int)pages.size(); i++) {
        int page = pages[i];
        bool found = false;
        for (int f : frames) {
            if (f == page) { found = true; break; }
        }

        Step s;
        s.page = page;

        if (found) {
            res.hits++;
            s.hit = true;
            s.replaced = -1;
            s.reason = "Page " + to_string(page) + " is already in memory (HIT)";
        } else {
            res.faults++;
            s.hit = false;
            int replaced = -1;

            if ((int)frames.size() < capacity) {
                frames.push_back(page);
                s.reason = "Empty slot found — loaded page " + to_string(page);
            } else {
                int lruPage = frames[0];
                int minTime = lastUsed.count(lruPage) ? lastUsed[lruPage] : 0;

                for (int f : frames) {
                    int t = lastUsed.count(f) ? lastUsed[f] : 0;
                    if (t < minTime) {
                        minTime = t;
                        lruPage = f;
                    }
                }

                for (int j = 0; j < (int)frames.size(); j++) {
                    if (frames[j] == lruPage) {
                        replaced = frames[j];
                        frames[j] = page;
                        break;
                    }
                }
                s.reason = "Page " + to_string(lruPage) + " was least recently used (step " +
                           to_string(minTime + 1) + ") — replaced by " + to_string(page);
            }

            s.replaced = replaced;
        }

        lastUsed[page] = i;

        vector<int> temp = frames;
        while ((int)temp.size() < capacity) temp.push_back(-1);
        s.frames = temp;
        res.steps.push_back(s);
    }

    int total = (int)pages.size();
    res.hitRatio   = (double)res.hits   / total;
    res.faultRatio = (double)res.faults / total;
    return res;
}
