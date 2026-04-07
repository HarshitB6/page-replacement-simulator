#include "utils.hpp"

Result lfu(const vector<int>& pages, int capacity) {
    vector<int> frames;
    unordered_map<int, int> freq;
    unordered_map<int, int> lastUsed; // for tie-breaking (LRU among same freq)

    Result res;
    res.algorithm = "LFU";
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
            freq[page]++;
            lastUsed[page] = i;
            s.reason = "Page " + to_string(page) + " is already in memory (HIT) — freq now " + to_string(freq[page]);
        } else {
            res.faults++;
            s.hit = false;
            int replaced = -1;

            if ((int)frames.size() < capacity) {
                frames.push_back(page);
                freq[page] = 1;
                lastUsed[page] = i;
                s.reason = "Empty slot found — loaded page " + to_string(page) + " (freq=1)";
            } else {
                // Find frame with lowest frequency; break ties by LRU
                int lfuPage = frames[0];
                int minFreq = freq.count(lfuPage) ? freq[lfuPage] : 0;
                int minTime = lastUsed.count(lfuPage) ? lastUsed[lfuPage] : 0;

                for (int f : frames) {
                    int fq = freq.count(f) ? freq[f] : 0;
                    int lt = lastUsed.count(f) ? lastUsed[f] : 0;
                    if (fq < minFreq || (fq == minFreq && lt < minTime)) {
                        minFreq = fq;
                        minTime = lt;
                        lfuPage = f;
                    }
                }

                for (int j = 0; j < (int)frames.size(); j++) {
                    if (frames[j] == lfuPage) {
                        replaced = frames[j];
                        frames[j] = page;
                        break;
                    }
                }

                s.reason = "Page " + to_string(lfuPage) + " had lowest frequency (" +
                           to_string(minFreq) + ") — replaced by " + to_string(page);

                freq.erase(lfuPage);
                lastUsed.erase(lfuPage);
                freq[page] = 1;
                lastUsed[page] = i;
            }

            s.replaced = replaced;
        }

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
