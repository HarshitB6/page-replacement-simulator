#include "utils.hpp"

Result optimal(const vector<int>& pages, int capacity) {
    vector<int> frames;

    Result res;
    res.algorithm = "Optimal";
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
                int farthest = -1, idx = -1;
                for (int j = 0; j < (int)frames.size(); j++) {
                    int k;
                    for (k = i + 1; k < (int)pages.size(); k++) {
                        if (pages[k] == frames[j]) break;
                    }
                    if (k > farthest) {
                        farthest = k;
                        idx = j;
                    }
                }

                replaced = frames[idx];
                string whenStr = (farthest == (int)pages.size())
                    ? "never used again"
                    : "next used at step " + to_string(farthest + 1);
                s.reason = "Page " + to_string(replaced) + " is " + whenStr +
                           " (farthest future use) — replaced by " + to_string(page);
                frames[idx] = page;
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
