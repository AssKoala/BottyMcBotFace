import praw
import sys

if len(sys.argv) < 7:
    print('not enough args!  main.py client_id client_secret user_agent search_limit time_filter subreddit1 [subreddit2...n]')
    exit()

search_limit = sys.argv[4]
time_filter = sys.argv[5]

reddit = praw.Reddit(
    client_id=sys.argv[1],
    client_secret=sys.argv[2],
    user_agent=sys.argv[3],
)

subreddits = sys.argv[6]
for i in range(6, len(sys.argv)):
    subreddits += "+" + sys.argv[i]

# print(f'Getting top {search_limit} posts of {time_filter} from {subreddits}')

for submission in reddit.subreddit(subreddits).top(time_filter=f"{time_filter}", limit=int(f"{search_limit}")):
    print(submission.url)
sys.stdout.flush()
