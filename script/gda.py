import sys
import math
from eth_abi import encode_single

def dgda(alpha, decay, t, q, k, m):
    numerator = k * (alpha ** m) * ((alpha ** q) - 1)
    denominator = (math.exp(decay * t)) * (alpha - 1)
    return numerator / denominator

if __name__ == '__main__':
    fname = sys.argv[1]
    args = sys.argv[3]       
    if fname == 'dgda':                       
        alpha, decay, t, q, k, m = args.split(',')
        alpha = float(alpha) 
        decay = float(decay)
        t = int(t)
        q = int(q)
        k = int(k)
        m = int(m)        
        result = int(dgda(alpha, decay, t, q, k, m) * 1e18)        
        print(encode_single('int256', result).hex())        
    