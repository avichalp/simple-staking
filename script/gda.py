import sys
import math
from eth_abi import encode_single

def cgda(rate, decay, t, q, k):
    numerator = k * (math.exp((decay * q) / rate) - 1)
    denominator = decay * math.exp(decay * t)
    return numerator / denominator
     
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
    if fname == 'cgda':        
        rate, decay, t, q, k = args.split(',')
        rate = float(rate)
        decay = float(decay)
        t = int(t)
        q = int(q)
        k = int(k)        
        result = int(cgda(rate, decay, t, q, k) * 1e18)                
        print(encode_single('int256', result).hex())    
    