#include "utils.hpp"

Result fifo(const vector<int>& pages, int capacity) {
    vector<int> frames(capacity, -1);
    queue<int> q;

    Result res;
    res.algorithm = "FIFO";
    res.faults = 0;
    res.hits = 0;

    for (int page : pages) {
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

            if ((int)q.size() < capacity) {
                for (int i = 0; i < capacity; i++) {
                    if (frames[i] == -1) {
                        frames[i] = page;
                        q.push(page);
                        break;
                    }
                }
                s.reason = "Empty slot found — loaded page " + to_string(page);
            } else {
                int old = q.front();
                q.pop();
                for (int i = 0; i < capacity; i++) {
                    if (frames[i] == old) {
                        replaced = frames[i];
                        frames[i] = page;
                        break;
                    }
                }
                q.push(page);
                s.reason = "Page " + to_string(old) + " was loaded first (oldest) — replaced by " + to_string(page);
            }

            s.replaced = replaced;
        }

        s.frames = frames;
        res.steps.push_back(s);
    }

    int total = (int)pages.size();
    res.hitRatio   = (double)res.hits   / total;
    res.faultRatio = (double)res.faults / total;
    return res;
}
